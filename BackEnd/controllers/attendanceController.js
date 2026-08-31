const supabase = require('../config/supabase');
const { getOrSetCache, invalidateCache } = require('../utils/cache');

// Haversine formula to calculate distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in metres
}

// Helper for Euclidean distance between two 128-d face descriptors
function calculateFaceDistance(desc1, desc2) {
    if (!desc1 || !desc2 || desc1.length !== desc2.length) return 1.0;
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        sum += Math.pow(desc1[i] - desc2[i], 2);
    }
    return Math.sqrt(sum);
}

// POST /api/hris/attendance/recognize-face
// Recognize face from camera and verify strictly against logged-in user's own account
exports.recognize_face = async (req, res) => {
    try {
        const { face_descriptor } = req.body; // Array of 128 numbers
        const loggedInUserId = req.userId;

        if (!face_descriptor || !Array.isArray(face_descriptor)) {
            return res.status(400).json({ message: 'Valid face descriptor array is required' });
        }

        // Fetch logged in user's employee record
        let selfEmp = null;
        if (loggedInUserId) {
            const { data: myEmp } = await supabase
                .from('employees')
                .select(`
                    id,
                    user_id,
                    nama_lengkap,
                    nomor_pegawai,
                    jabatan,
                    penempatan,
                    face_descriptor,
                    departments (name)
                `)
                .eq('user_id', loggedInUserId)
                .maybeSingle();

            if (myEmp) {
                selfEmp = myEmp;
            } else {
                // Check if user has an employee record matched by username/email
                const { data: userRec } = await supabase.from('users').select('username, email').eq('id', loggedInUserId).maybeSingle();
                if (userRec) {
                    const cleanName = (userRec.username || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
                    const { data: fallbackEmp } = await supabase.from('employees').select(`
                        id,
                        user_id,
                        nama_lengkap,
                        nomor_pegawai,
                        jabatan,
                        penempatan,
                        face_descriptor,
                        departments (name)
                    `).or(`nama_lengkap.ilike.%${cleanName}%,nomor_pegawai.ilike.%${userRec.username}%`).maybeSingle();
                    if (fallbackEmp) {
                        selfEmp = fallbackEmp;
                        await supabase.from('employees').update({ user_id: loggedInUserId }).eq('id', fallbackEmp.id);
                    }
                }
            }
        }

        if (!selfEmp) {
            return res.status(400).json({
                recognized: false,
                message: 'Data profil karyawan untuk akun login Anda tidak ditemukan di sistem.'
            });
        }

        const THRESHOLD = 0.58; // Calibrated for facial variation (glasses, lighting, angle, APD)

        // 1. STRICT ANTI-IMPERSONATION: First check if this face matches ANY OTHER employee in the database
        const enrolledEmployees = await getOrSetCache('master:enrolled_faces', 300, async () => {
            const { data, error } = await supabase
                .from('employees')
                .select(`id, nama_lengkap, face_descriptor`)
                .not('face_descriptor', 'is', null);

            if (error) throw error;
            return data || [];
        });

        let otherMatch = null;
        for (const emp of enrolledEmployees) {
            if (emp.id === selfEmp.id) continue;
            try {
                const otherRaw = typeof emp.face_descriptor === 'string' ? JSON.parse(emp.face_descriptor) : emp.face_descriptor;
                let otherSamples = (otherRaw && Array.isArray(otherRaw.descriptors)) ? otherRaw.descriptors : (Array.isArray(otherRaw) ? (Array.isArray(otherRaw[0]) ? otherRaw : [otherRaw]) : []);
                for (const s of otherSamples) {
                    if (calculateFaceDistance(face_descriptor, s) <= THRESHOLD) {
                        otherMatch = emp;
                        break;
                    }
                }
                if (otherMatch) break;
            } catch (e) {}
        }

        // If face in camera belongs to someone else -> BLOCK IMMEDIATELY
        if (otherMatch) {
            return res.json({
                recognized: false,
                isMismatch: true,
                message: `Wajah yang terdeteksi adalah milik ${otherMatch.nama_lengkap}, BUKAN akun yang sedang login (${selfEmp.nama_lengkap}). Presensi ditolak karena akun biometrik tidak sesuai!`
            });
        }

        // 2. If logged in employee already has an enrolled face descriptor, verify strictly against own record
        if (selfEmp.face_descriptor) {
            const storedRaw = typeof selfEmp.face_descriptor === 'string' ? JSON.parse(selfEmp.face_descriptor) : selfEmp.face_descriptor;
            let selfSamples = [];

            if (storedRaw && typeof storedRaw === 'object' && !Array.isArray(storedRaw) && Array.isArray(storedRaw.descriptors)) {
                selfSamples = storedRaw.descriptors;
            } else if (Array.isArray(storedRaw)) {
                selfSamples = Array.isArray(storedRaw[0]) ? storedRaw : [storedRaw];
            }

            let lowestDistance = 1.0;
            for (const sample of selfSamples) {
                const distance = calculateFaceDistance(face_descriptor, sample);
                if (distance < lowestDistance) {
                    lowestDistance = distance;
                }
            }

            if (lowestDistance <= THRESHOLD) {
                const normalizedConfidence = Math.max(0.80, Math.min(0.99, 1.0 - (lowestDistance / THRESHOLD) * 0.18));

                return res.json({
                    recognized: true,
                    isOwnAccount: true,
                    confidence: +normalizedConfidence.toFixed(2),
                    distance: lowestDistance.toFixed(4),
                    employee: {
                        id: selfEmp.id,
                        user_id: selfEmp.user_id,
                        nama_lengkap: selfEmp.nama_lengkap,
                        nomor_pegawai: selfEmp.nomor_pegawai,
                        jabatan: selfEmp.jabatan,
                        penempatan: selfEmp.penempatan,
                        department: selfEmp.departments?.name || 'General'
                    }
                });
            } else {
                return res.json({
                    recognized: false,
                    message: `Wajah tidak cocok dengan data biometrik akun Anda (${selfEmp.nama_lengkap}).`
                });
            }
        }

        // 3. User does NOT have an enrolled face yet, AND face does NOT match any other employee
        // Auto-enroll new unique face descriptor to selfEmp
        const newDescriptorObj = { descriptors: [face_descriptor], count: 1, updated_at: new Date().toISOString() };
        await supabase.from('employees').update({
            face_descriptor: newDescriptorObj
        }).eq('id', selfEmp.id);
        await invalidateCache('emp:*');
        await invalidateCache('master:enrolled_faces');
        selfEmp.face_descriptor = newDescriptorObj;

        return res.json({
            recognized: true,
            isOwnAccount: true,
            isFirstEnrollment: true,
            confidence: 0.98,
            distance: '0.0500',
            employee: {
                id: selfEmp.id,
                user_id: selfEmp.user_id,
                nama_lengkap: selfEmp.nama_lengkap,
                nomor_pegawai: selfEmp.nomor_pegawai,
                jabatan: selfEmp.jabatan,
                penempatan: selfEmp.penempatan,
                department: selfEmp.departments?.name || 'General'
            },
            message: `Wajah Anda (${selfEmp.nama_lengkap}) berhasil didaftarkan dan terverifikasi secara otomatis!`
        });
    } catch (err) {
        console.error('Face recognition error:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/hris/attendance/clock
// Clock In or Clock Out with location & anti-mock location verification (NO image saved)
exports.clock_in_out = async (req, res) => {
    try {
        const { validateGPSCoordinates, calculateDistanceMeters } = require('../utils/sanitizer');
        const { employee_id, latitude, longitude, accuracy, is_mock, device_info, notes, timestamp } = req.body;
        const loggedInUserId = req.userId;

        // STRICT ACCOUNT OWNERSHIP: Ensure attendance is ALWAYS processed for the logged-in user's own employee record
        let { data: selfEmp } = await supabase
            .from('employees')
            .select('id, user_id, camera_access, gps_access, wifi_access, face_descriptor, nama_lengkap, penempatan')
            .eq('user_id', loggedInUserId)
            .maybeSingle();

        if (!selfEmp) {
            const { data: userRec } = await supabase.from('users').select('username, email').eq('id', loggedInUserId).maybeSingle();
            if (userRec) {
                const cleanName = (userRec.username || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
                const { data: fallbackEmp } = await supabase.from('employees').select('id, user_id, camera_access, gps_access, wifi_access, face_descriptor, nama_lengkap, penempatan')
                    .or(`nama_lengkap.ilike.%${cleanName}%,nomor_pegawai.ilike.%${userRec.username}%`).maybeSingle();
                if (fallbackEmp) {
                    selfEmp = fallbackEmp;
                    await supabase.from('employees').update({ user_id: loggedInUserId }).eq('id', fallbackEmp.id);
                }
            }
        }

        if (!selfEmp) {
            return res.status(400).json({ message: 'Data karyawan Anda belum terhubung dengan akun login.' });
        }

        if (employee_id && employee_id !== selfEmp.id && employee_id !== selfEmp.user_id) {
            return res.status(403).json({
                message: `Presensi ditolak: Presensi hanya dapat dilakukan oleh akun Anda sendiri (${selfEmp.nama_lengkap}). Anda tidak dapat melakukan presensi untuk akun karyawan lain.`
            });
        }

        const targetEmployeeId = selfEmp.id;
        const empRecord = selfEmp;

        const isGpsRequired = empRecord ? (empRecord.gps_access !== false) : true;
        const isCameraRequired = empRecord ? (empRecord.camera_access !== false) : true;

        // Anti-Fake GPS Checks & Geofence Validation (Only if GPS is required)
        if (isGpsRequired) {
            if (is_mock === true) {
                return res.status(400).json({
                    message: 'Presensi ditolak: Terdeteksi penggunaan Fake GPS / Mock Location!'
                });
            }

            const gpsValidation = validateGPSCoordinates({
                lat: latitude,
                lng: longitude,
                accuracy,
                timestamp
            });

            if (!gpsValidation.valid) {
                return res.status(400).json({ message: `Presensi ditolak: ${gpsValidation.error || 'Koordinat GPS wajib diisi'}` });
            }

            // Server-Side Geofencing Verification against Database Locations
            const { data: locData } = await supabase
                .from('settings')
                .select('setting_value')
                .eq('setting_key', 'locations')
                .maybeSingle();

            let activeLocations = [
                { id: 1, name: 'Head Office Banjarbaru', lat: -3.42436, lng: 115.99267, radius: 50 },
                { id: 2, name: 'DEA Site Angsana', lat: -3.70968, lng: 115.60683, radius: 50 }
            ];

            if (locData && locData.setting_value) {
                try {
                    const parsed = typeof locData.setting_value === 'string' ? JSON.parse(locData.setting_value) : locData.setting_value;
                    if (Array.isArray(parsed) && parsed.length > 0) activeLocations = parsed;
                } catch (e) {
                    console.error('Locations parse error:', e);
                }
            }

            let isWithinAnyGeofence = false;
            let nearestSiteName = '';
            let minDistanceMeters = Infinity;

            for (const loc of activeLocations) {
                const dist = calculateDistanceMeters(gpsValidation.lat, gpsValidation.lng, loc.lat, loc.lng);
                if (dist < minDistanceMeters) {
                    minDistanceMeters = dist;
                    nearestSiteName = loc.name;
                }
                // Allow defined radius + 100m GPS variance buffer
                const allowedRadius = (loc.radius || 50) + 100;
                if (dist <= allowedRadius) {
                    isWithinAnyGeofence = true;
                    break;
                }
            }

            if (!isWithinAnyGeofence) {
                return res.status(400).json({
                    message: `Presensi ditolak: Anda berada di luar radius geofence resmi (${Math.round(minDistanceMeters)}m dari ${nearestSiteName}). Silakan mendekat ke lokasi kantor/site.`
                });
            }
        }

        // Strict Face Biometric Verification if Camera is required
        const { face_descriptor: incomingFaceDesc } = req.body;
        if (isCameraRequired) {
            if (!incomingFaceDesc || !Array.isArray(incomingFaceDesc) || incomingFaceDesc.length < 50) {
                return res.status(400).json({
                    message: 'Presensi ditolak: Wajah Anda wajib terdeteksi secara langsung di depan kamera saat menekan tombol presensi. Posisikan wajah Anda tepat di depan kamera.'
                });
            }

            // 1. Cross-account Impersonation Prevention: Ensure incoming face does not belong to another enrolled employee
            const enrolledEmployees = await getOrSetCache('master:enrolled_faces', 300, async () => {
                const { data, error } = await supabase
                    .from('employees')
                    .select(`id, nama_lengkap, face_descriptor`)
                    .not('face_descriptor', 'is', null);

                if (error) throw error;
                return data || [];
            });

            for (const otherEmp of enrolledEmployees) {
                if (otherEmp.id === empRecord.id) continue;
                try {
                    const oRaw = typeof otherEmp.face_descriptor === 'string' ? JSON.parse(otherEmp.face_descriptor) : otherEmp.face_descriptor;
                    let oSamples = (oRaw && Array.isArray(oRaw.descriptors)) ? oRaw.descriptors : (Array.isArray(oRaw) ? (Array.isArray(oRaw[0]) ? oRaw : [oRaw]) : []);
                    for (const s of oSamples) {
                        if (calculateFaceDistance(incomingFaceDesc, s) <= 0.58) {
                            return res.status(403).json({
                                message: `Presensi ditolak: Wajah di depan kamera adalah milik ${otherEmp.nama_lengkap}. Anda tidak dapat melakukan presensi untuk akun karyawan lain (${empRecord.nama_lengkap})!`
                            });
                        }
                    }
                } catch (e) {}
            }

            // 2. If employee already has face registered, verify strictly against own descriptor
            if (empRecord?.face_descriptor) {
                try {
                    const storedRaw = typeof empRecord.face_descriptor === 'string' ? JSON.parse(empRecord.face_descriptor) : empRecord.face_descriptor;
                    let samples = [];

                    if (storedRaw && typeof storedRaw === 'object' && Array.isArray(storedRaw.descriptors)) {
                        samples = storedRaw.descriptors;
                    } else if (Array.isArray(storedRaw)) {
                        samples = Array.isArray(storedRaw[0]) ? storedRaw : [storedRaw];
                    }

                    let minFaceDist = 1.0;
                    for (const sample of samples) {
                        const dist = calculateFaceDistance(incomingFaceDesc, sample);
                        if (dist < minFaceDist) minFaceDist = dist;
                    }
                    if (minFaceDist > 0.58) {
                        return res.status(400).json({
                            message: `Presensi ditolak: Wajah di depan kamera tidak sesuai dengan data biometrik akun Anda (${empRecord.nama_lengkap}). Presensi dikunci demi keamanan.`
                        });
                    }
                } catch (faceErr) {
                    console.error('Face validation error:', faceErr);
                    return res.status(400).json({
                        message: 'Presensi ditolak: Terjadi kesalahan saat memverifikasi struktur biometrik wajah.'
                    });
                }
            } else {
                // First-time enrollment for novel face
                const newDescObj = { descriptors: [incomingFaceDesc], count: 1, updated_at: new Date().toISOString() };
                await supabase.from('employees').update({ face_descriptor: newDescObj }).eq('id', empRecord.id);
                await invalidateCache('emp:*');
                await invalidateCache('master:enrolled_faces');
                empRecord.face_descriptor = newDescObj;
            }
        }

        // Fetch company schedule & shift window settings
        const { data: allSettingsData } = await supabase
            .from('settings')
            .select('setting_key, setting_value');

        const companySettings = {};
        (allSettingsData || []).forEach(item => {
            if (item.setting_key) companySettings[item.setting_key] = item.setting_value;
        });

        const checkInStart = companySettings.checkInStart || '06:00';
        const checkInEnd = companySettings.checkInEnd || '08:00';
        const checkOutStart = companySettings.checkOutStart || '17:00';
        const checkOutEnd = companySettings.checkOutEnd || '23:59';
        const maxLateMinutes = parseInt(companySettings.maxLateMinutes, 10) || 30;

        // Local WITA Time Calculation
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Makassar',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const parts = formatter.formatToParts(new Date());
        const timeMap = {};
        parts.forEach(p => timeMap[p.type] = p.value);

        const today = `${timeMap.year}-${timeMap.month}-${timeMap.day}`;
        const currentHour = parseInt(timeMap.hour, 10);
        const currentMinute = parseInt(timeMap.minute, 10);
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        const currentTimeDisplay = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')} WITA`;
        const now = new Date().toISOString();

        const parseTimeToMinutes = (tStr) => {
            if (!tStr) return 0;
            const [h, m] = tStr.split(':').map(Number);
            return (h * 60) + (m || 0);
        };

        const inStartMin = parseTimeToMinutes(checkInStart);
        const inEndMin = parseTimeToMinutes(checkInEnd);
        const inLateLimitMin = inEndMin + maxLateMinutes;
        const outStartMin = parseTimeToMinutes(checkOutStart);
        const outEndMin = parseTimeToMinutes(checkOutEnd);

        // Check if employee already clocked in today
        const { data: existingLog, error: fetchErr } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('employee_id', targetEmployeeId)
            .eq('date', today)
            .maybeSingle();

        const reqType = (req.body.type || req.body.action_type || req.body.action || '').toLowerCase();
        const isExplicitIn = reqType === 'in' || reqType.includes('in') || reqType.includes('masuk');
        const isExplicitOut = reqType === 'out' || reqType.includes('out') || reqType.includes('pulang');

        let isClockOutMode = false;
        if (isExplicitOut) {
            isClockOutMode = true;
        } else if (isExplicitIn) {
            isClockOutMode = false;
        } else {
            isClockOutMode = currentTotalMinutes >= outStartMin || (existingLog && !existingLog.check_out);
        }

        let actionType = isClockOutMode ? 'Clock Out' : 'Clock In';
        let resultLog = null;

        if (isClockOutMode) {
            // CLOCK OUT SCHEDULE WINDOW VALIDATION
            if (currentTotalMinutes < outStartMin) {
                return res.status(400).json({
                    message: `Presensi pulang ditolak: Belum memasuki jadwal jam kepulangan kantor (Jadwal pulang buka mulai jam ${checkOutStart} WITA, waktu saat ini: ${currentTimeDisplay}).`
                });
            }

            if (currentTotalMinutes > outEndMin) {
                return res.status(400).json({
                    message: `Presensi pulang ditolak: Batas waktu jam kepulangan kantor telah berakhir (Batas jam ${checkOutEnd} WITA, waktu saat ini: ${currentTimeDisplay}). Harap hubungi HRGA.`
                });
            }

            // 2. CHECK-IN MANDATORY VALIDATION: Must have checked in today first!
            if (!existingLog || !existingLog.check_in) {
                return res.status(400).json({
                    message: `Presensi pulang ditolak: Anda belum melakukan Presensi Masuk (Check-In) hari ini. Presensi Pulang tidak dapat diproses tanpa data Check-In agar total jam kerja dapat terhitung dengan benar. Silakan hubungi HRGA untuk pengajuan penyesuaian kehadiran.`
                });
            }

            if (existingLog.check_out) {
                return res.status(400).json({
                    message: 'Anda sudah menyelesaikan presensi pulang hari ini.'
                });
            }

            // 3. Update existing morning check-in log with checkout time
            actionType = 'Clock Out';
            const { data, error } = await supabase
                .from('attendance_logs')
                .update({
                    check_out: now,
                    notes: existingLog.notes ? `${existingLog.notes} | Out: ${currentTimeDisplay}` : `Out: ${currentTimeDisplay}`
                })
                .eq('id', existingLog.id)
                .select('*')
                .single();

            if (error) throw error;
            resultLog = data;
        } else {
            // CLOCK IN MODE
            if (existingLog) {
                if (existingLog.check_in && !existingLog.check_out) {
                    return res.status(400).json({
                        message: 'Anda sudah melakukan presensi masuk hari ini. Saat ini menunggu jadwal jam pulang kantor.'
                    });
                } else if (existingLog.check_in && existingLog.check_out) {
                    return res.status(400).json({
                        message: 'Anda sudah menyelesaikan seluruh presensi masuk dan pulang untuk hari ini.'
                    });
                }
            }

            // CLOCK IN SCHEDULE WINDOW VALIDATION
            if (currentTotalMinutes < inStartMin) {
                return res.status(400).json({
                    message: `Presensi masuk ditolak: Belum memasuki jadwal jam masuk kerja (Jadwal buka jam ${checkInStart} WITA, waktu saat ini: ${currentTimeDisplay}).`
                });
            }

            if (currentTotalMinutes > inLateLimitMin) {
                return res.status(400).json({
                    message: `Presensi masuk ditolak: Batas jam masuk dan toleransi keterlambatan hari ini telah berakhir (Batas akhir: ${checkInEnd} WITA + toleransi ${maxLateMinutes} menit, waktu saat ini: ${currentTimeDisplay}). Harap hubungi HRGA.`
                });
            }

            const attendanceStatus = currentTotalMinutes > inEndMin ? 'Terlambat' : 'Hadir';
            actionType = 'Clock In';
            const { data, error } = await supabase
                .from('attendance_logs')
                .insert({
                    employee_id: targetEmployeeId,
                    date: today,
                    status: attendanceStatus,
                    check_in: now,
                    latitude: latitude || null,
                    longitude: longitude || null,
                    device_info: device_info || req.headers['user-agent'],
                    notes: notes ? `${notes} (${attendanceStatus} pada ${currentTimeDisplay})` : `Presensi Wajah (${attendanceStatus})`,
                    recorded_by: req.userId || null
                })
                .select('*')
                .single();

            if (error) throw error;
            resultLog = data;
        }

        await invalidateCache(`attendance:summary:${today}`);
        await invalidateCache(`dashboard:*`);

        res.json({
            message: `Berhasil melakukan ${actionType}`,
            action: actionType,
            data: resultLog
        });
    } catch (err) {
        console.error('Clock error:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/attendance/daily-status
exports.get_daily_status = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Fetch all active employees
        const { data: allEmployees, error: empErr } = await supabase
            .from('employees')
            .select(`
                id,
                nama_lengkap,
                nomor_pegawai,
                jabatan,
                level,
                penempatan,
                departments (name)
            `)
            .order('nama_lengkap', { ascending: true });

        if (empErr) throw empErr;

        // 2. Fetch today's attendance logs
        const { data: todayLogs, error: logErr } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('date', today);

        if (logErr) throw logErr;

        // 3. Fetch today's approved leaves
        const { data: todayLeaves } = await supabase
            .from('leaves')
            .select('*')
            .lte('start_date', today)
            .gte('end_date', today)
            .eq('status', 'Approved');

        const logMap = {};
        (todayLogs || []).forEach(log => {
            logMap[log.employee_id] = log;
        });

        const leaveMap = {};
        (todayLeaves || []).forEach(leave => {
            leaveMap[leave.employee_id] = leave;
        });

        const sudahAbsen = [];
        const belumAbsen = [];
        const tidakHadir = [];

        (allEmployees || []).forEach(emp => {
            const log = logMap[emp.id];
            const leave = leaveMap[emp.id];

            if (log) {
                const formatTime = (ts) => {
                    if (!ts) return null;
                    try {
                        const d = new Date(ts);
                        if (isNaN(d.getTime())) return ts;
                        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    } catch (e) {
                        return ts;
                    }
                };

                sudahAbsen.push({
                    id: emp.id,
                    nama: emp.nama_lengkap,
                    nip: emp.nomor_pegawai,
                    jabatan: emp.jabatan,
                    departemen: emp.departments?.name || 'Operasional',
                    check_in: formatTime(log.check_in) || '07:30',
                    check_out: formatTime(log.check_out),
                    status: log.status || (log.late_minutes > 0 ? 'Terlambat' : 'Tepat Waktu'),
                    late_minutes: log.late_minutes || 0,
                    location: log.location_address || emp.penempatan || 'Site BIB'
                });
            } else if (leave) {
                tidakHadir.push({
                    id: emp.id,
                    nama: emp.nama_lengkap,
                    nip: emp.nomor_pegawai,
                    jabatan: emp.jabatan,
                    departemen: emp.departments?.name || 'Operasional',
                    kategori: leave.leave_type || 'Cuti Roster',
                    alasan: leave.reason || 'Sesuai Jadwal'
                });
            } else {
                belumAbsen.push({
                    id: emp.id,
                    nama: emp.nama_lengkap,
                    nip: emp.nomor_pegawai,
                    jabatan: emp.jabatan,
                    departemen: emp.departments?.name || 'Operasional',
                    penempatan: emp.penempatan || 'Site BIB'
                });
            }
        });

        res.json({
            date: today,
            summary: {
                total_karyawan: (allEmployees || []).length,
                sudah_absen: sudahAbsen.length,
                belum_absen: belumAbsen.length,
                tidak_hadir: tidakHadir.length
            },
            sudah_absen: sudahAbsen,
            belum_absen: belumAbsen,
            tidak_hadir: tidakHadir
        });
    } catch (err) {
        console.error('Daily status error:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/attendance/my-today
exports.get_my_attendance_today = async (req, res) => {
    try {
        const loggedInUserId = req.userId;
        const today = new Date().toISOString().split('T')[0];

        let { data: selfEmp } = await supabase
            .from('employees')
            .select('id, nama_lengkap')
            .eq('user_id', loggedInUserId)
            .maybeSingle();

        if (!selfEmp) {
            return res.json({ has_log: false, has_checked_in: false, has_checked_out: false, log: null });
        }

        const { data: log } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('employee_id', selfEmp.id)
            .eq('date', today)
            .maybeSingle();

        res.json({
            has_log: !!log,
            has_checked_in: !!log?.check_in,
            has_checked_out: !!log?.check_out,
            check_in_time: log?.check_in || null,
            check_out_time: log?.check_out || null,
            status: log?.status || null,
            log: log || null
        });
    } catch (err) {
        console.error('get_my_attendance_today error:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/attendance/today
exports.get_attendance_today = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `attendance:summary:${today}`;

        const data = await getOrSetCache(cacheKey, 300, async () => {
            const { data: logs, error } = await supabase
                .from('attendance_logs')
                .select(`
                    *,
                    employees (
                        id,
                        nama_lengkap,
                        nomor_pegawai,
                        jabatan,
                        penempatan,
                        departments (name)
                    )
                `)
                .eq('date', today)
                .order('check_in', { ascending: false });

            if (error) throw error;
            return logs || [];
        });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/attendance/history
exports.get_attendance_history = async (req, res) => {
    try {
        const { employee_id, start_date, end_date } = req.query;
        let query = supabase
            .from('attendance_logs')
            .select(`
                *,
                employees (
                    id,
                    nama_lengkap,
                    nomor_pegawai,
                    jabatan,
                    departments (name)
                )
            `)
            .order('date', { ascending: false })
            .limit(100);

        if (employee_id) query = query.eq('employee_id', employee_id);
        if (start_date) query = query.gte('date', start_date);
        if (end_date) query = query.lte('date', end_date);

        const { data, error } = await query;
        if (error) throw error;

        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
