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
// Recognize face from camera and return matched employee details
exports.recognize_face = async (req, res) => {
    try {
        const { face_descriptor } = req.body; // Array of 128 numbers

        if (!face_descriptor || !Array.isArray(face_descriptor)) {
            return res.status(400).json({ message: 'Valid face descriptor array is required' });
        }

        // Fetch all employees with enrolled faces (Cached in Redis for 10 minutes)
        const enrolledEmployees = await getOrSetCache('master:enrolled_faces', 600, async () => {
            const { data, error } = await supabase
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
                .not('face_descriptor', 'is', null);

            if (error) throw error;
            return data || [];
        });

        let bestMatch = null;
        let lowestDistance = 1.0;
        const THRESHOLD = 0.40; // Strict Face recognition distance threshold (Zero tolerance for unknown faces)

        for (const emp of enrolledEmployees) {
            try {
                const storedData = JSON.parse(emp.face_descriptor);
                // storedData can be a single descriptor array or an array of sample descriptors
                const samples = Array.isArray(storedData[0]) ? storedData : [storedData];

                for (const sample of samples) {
                    const distance = calculateFaceDistance(face_descriptor, sample);
                    if (distance < lowestDistance) {
                        lowestDistance = distance;
                        if (distance <= THRESHOLD) {
                            bestMatch = emp;
                        }
                    }
                }
            } catch (parseErr) {
                // Ignore invalid JSON
            }
        }

        if (bestMatch) {
            return res.json({
                recognized: true,
                confidence: (1 - lowestDistance).toFixed(2),
                distance: lowestDistance.toFixed(4),
                employee: {
                    id: bestMatch.id,
                    user_id: bestMatch.user_id,
                    nama_lengkap: bestMatch.nama_lengkap,
                    nomor_pegawai: bestMatch.nomor_pegawai,
                    jabatan: bestMatch.jabatan,
                    penempatan: bestMatch.penempatan,
                    department: bestMatch.departments?.name || 'General'
                }
            });
        } else {
            return res.json({
                recognized: false,
                lowest_distance: lowestDistance.toFixed(4),
                message: 'Wajah tidak dikenali dalam sistem (Wajib sesuai database)'
            });
        }
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
        let targetEmployeeId = employee_id;

        // IDOR Prevention: Ensure regular users cannot clock for other employees
        if (req.userRole === 'user' || !targetEmployeeId) {
            const { data: selfEmp } = await supabase
                .from('employees')
                .select('id, user_id')
                .eq('user_id', req.userId)
                .single();

            if (!selfEmp) {
                return res.status(400).json({ message: 'Data karyawan Anda belum terhubung dengan akun login.' });
            }

            if (targetEmployeeId && targetEmployeeId !== selfEmp.id && req.userRole === 'user') {
                return res.status(403).json({ message: 'Akses ditolak: Anda tidak dapat melakukan presensi untuk akun karyawan lain (IDOR Protected).' });
            }
            targetEmployeeId = selfEmp.id;
        }

        // Anti-Fake GPS Checks & Validation
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
            return res.status(400).json({ message: `Presensi ditolak: ${gpsValidation.error}` });
        }

        // Server-Side Geofencing Verification against Database Locations
        const { data: locData } = await supabase
            .from('settings')
            .select('setting_value')
            .eq('setting_key', 'locations')
            .maybeSingle();

        const activeLocations = (locData && Array.isArray(locData.setting_value)) ? locData.setting_value : [
            { id: 1, name: 'Head Office Banjarbaru', lat: -3.42436, lng: 115.99267, radius: 50 },
            { id: 2, name: 'Project Site Batulicin', lat: -3.45678, lng: 116.01234, radius: 200 }
        ];

        let isWithinAnyGeofence = false;
        let nearestSiteName = '';
        let minDistanceMeters = Infinity;

        for (const loc of activeLocations) {
            const dist = calculateDistanceMeters(gpsValidation.lat, gpsValidation.lng, loc.lat, loc.lng);
            if (dist < minDistanceMeters) {
                minDistanceMeters = dist;
                nearestSiteName = loc.name;
            }
            // Allow defined radius + 50m GPS variance buffer
            const allowedRadius = (loc.radius || 100) + 50;
            if (dist <= allowedRadius) {
                isWithinAnyGeofence = true;
                break;
            }
        }

        // Fetch employee hardware access permissions & biometric face descriptor
        const { data: empRecord } = await supabase
            .from('employees')
            .select('id, camera_access, gps_access, wifi_access, face_descriptor, nama_lengkap, penempatan')
            .eq('id', targetEmployeeId)
            .maybeSingle();

        const isGpsRequired = empRecord ? (empRecord.gps_access !== false) : true;
        const isCameraRequired = empRecord ? (empRecord.camera_access !== false) : true;

        // WiFi Office Network Enforcement:
        // Mandatory for ALL employees, unless Super Admin explicitly set wifi_access === false (Bypass Lapangan)
        const isWifiBypassed = empRecord?.wifi_access === false;

        if (!isWifiBypassed) {
            const { data: ipData } = await supabase
                .from('settings')
                .select('setting_value')
                .eq('setting_key', 'allowed_ips')
                .maybeSingle();

            const allowedIps = (ipData?.setting_value || '').split(',').map(s => s.trim()).filter(Boolean);
            let rawClientIp = req.headers['cf-connecting-ip']
                || req.headers['x-real-ip']
                || (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || req.socket.remoteAddress || '127.0.0.1'));

            if (rawClientIp.startsWith('::ffff:')) {
                rawClientIp = rawClientIp.replace('::ffff:', '');
            }

            const isIpAllowed = allowedIps.length > 0 && allowedIps.some(allowed => {
                const cleanAllowed = allowed.trim();
                if (!cleanAllowed) return false;
                if (cleanAllowed === '0.0.0.0/0' || cleanAllowed === '*') return true;
                if (cleanAllowed === rawClientIp) return true;

                // Subnet prefix check (e.g. 36.83.26.0/24 matches 36.83.26.x)
                if (cleanAllowed.includes('/24')) {
                    const baseSubnet = cleanAllowed.split('/')[0].split('.').slice(0, 3).join('.');
                    if (rawClientIp.startsWith(baseSubnet + '.')) return true;
                }
                if (cleanAllowed.includes('/16')) {
                    const baseSubnet = cleanAllowed.split('/')[0].split('.').slice(0, 2).join('.');
                    if (rawClientIp.startsWith(baseSubnet + '.')) return true;
                }
                // Partial IP prefix matching
                if (rawClientIp === cleanAllowed || rawClientIp.startsWith(cleanAllowed)) return true;
                return false;
            });

            if (!isIpAllowed) {
                return res.status(400).json({
                    message: `Presensi ditolak: Anda terhubung dari jaringan IP (${rawClientIp}) di luar jaringan WiFi Kantor resmi PT DEA GLOBAL NIAGA (${allowedIps.join(', ')}). Anda wajib terhubung ke WiFi kantor resmi untuk presensi, terkecuali hak akses Anda telah diubah menjadi "Bypass Lapangan" oleh Super Admin.`
                });
            }
        }

        // Strict Face Biometric Verification if Camera is required
        const { face_descriptor: incomingFaceDesc } = req.body;
        if (isCameraRequired) {
            if (!empRecord?.face_descriptor) {
                return res.status(400).json({
                    message: `Data biometrik wajah karyawan (${empRecord?.nama_lengkap || 'Karyawan'}) belum didaftarkan dalam sistem. Harap daftarkan wajah terlebih dahulu melalui HRGA/Super Admin.`
                });
            }
            if (!incomingFaceDesc || !Array.isArray(incomingFaceDesc) || incomingFaceDesc.length < 50) {
                return res.status(400).json({
                    message: 'Presensi ditolak: Wajah Anda wajib terdeteksi secara langsung di depan kamera saat menekan tombol presensi. Posisikan wajah Anda tepat di depan kamera.'
                });
            }

            try {
                const storedData = JSON.parse(empRecord.face_descriptor);
                const samples = Array.isArray(storedData[0]) ? storedData : [storedData];
                let minFaceDist = 1.0;
                for (const sample of samples) {
                    const dist = calculateFaceDistance(incomingFaceDesc, sample);
                    if (dist < minFaceDist) minFaceDist = dist;
                }
                if (minFaceDist > 0.40) {
                    return res.status(400).json({
                        message: `Presensi ditolak: Wajah di depan kamera (${empRecord.nama_lengkap}) tidak sesuai dengan data biometrik yang tersimpan di sistem. Presensi dikunci demi keamanan.`
                    });
                }
            } catch (faceErr) {
                console.error('Face validation error:', faceErr);
                return res.status(400).json({
                    message: 'Presensi ditolak: Terjadi kesalahan saat memverifikasi struktur biometrik wajah.'
                });
            }
        }

        // Check if employee has GPS validation active or if within geofence
        if (isGpsRequired && !isWithinAnyGeofence) {
            return res.status(400).json({
                message: `Presensi ditolak: Anda berada di luar radius geofence resmi (${Math.round(minDistanceMeters)}m dari ${nearestSiteName}). Silakan mendekat ke lokasi kantor/site.`
            });
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

        let actionType = 'Clock In';
        let resultLog = null;

        if (!existingLog) {
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
        } else if (!existingLog.check_out) {
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
            return res.status(400).json({
                message: 'Anda sudah menyelesaikan seluruh presensi masuk dan pulang untuk hari ini.'
            });
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
