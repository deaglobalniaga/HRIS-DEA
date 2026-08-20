const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { getSecurityConfig, getJwtSecret, getJwtExpiry } = require('../config/jwtSecret');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const UAParser = require('ua-parser-js');
const mailer = require('../utils/mailer');
const { processUploadedFile } = require('../utils/fileStorage');
const { getOrSetCache, invalidateCache } = require('../utils/cache');

// Utility to set HttpOnly Cookie with configurable dynamic TTL
const setAuthCookie = (res, token, maxAgeMs = 5 * 60 * 60 * 1000) => {
    res.cookie('access_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: maxAgeMs
    });
};

exports.signup = async (req, res) => {
    try {
        const payload = req.body || {};
        const username = String(payload.username || '').trim();
        const password = String(payload.password || '').trim();
        const nama = String(payload.nama || payload.nama_lengkap || '').trim();
        const email_office = String(payload.email_office || payload.email || '').trim();

        if (!username || !password || !nama) {
            return res.status(400).json({ message: 'Username, password, dan nama lengkap wajib diisi' });
        }

        // Check if username or email already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .ilike('username', username)
            .maybeSingle();

        if (existingUser) {
            return res.status(400).json({ message: 'Username sudah digunakan, silakan gunakan username lain' });
        }

        if (email_office) {
            const { data: existingEmail } = await supabase
                .from('users')
                .select('id')
                .ilike('email', email_office)
                .maybeSingle();

            if (existingEmail) {
                return res.status(400).json({ message: 'Email sudah terdaftar dalam sistem' });
            }
        }

        // Get Role ID for 'user'
        const { data: roleData } = await supabase.from('roles').select('id').ilike('name', 'user').maybeSingle();
        const roleId = roleData?.id || 5;

        // Determine department ID
        let departmentId = null;
        if (payload.department) {
            const { data: deptData } = await supabase.from('departments').select('id').ilike('name', payload.department.trim()).maybeSingle();
            if (deptData) {
                departmentId = deptData.id;
            } else {
                const { data: newDept } = await supabase.from('departments').insert({
                    name: payload.department.trim(),
                    cost_center: payload.cost_center || 'GENERAL'
                }).select('id').single();
                departmentId = newDept?.id;
            }
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const empNumber = `EMP-${Date.now().toString().slice(-6)}`;

        // 1. Create User (Pending Super Admin verification)
        const { data: newUser, error: userErr } = await supabase
            .from('users')
            .insert({
                username,
                email: email_office || `${username}@deaglobalniaga.com`,
                password_hash: passwordHash,
                role_id: roleId,
                is_active: false,
                must_change_password: false
            })
            .select('id')
            .single();

        if (userErr) throw userErr;

        // 2. Create Employee
        const { data: newEmployee, error: empErr } = await supabase
            .from('employees')
            .insert({
                user_id: newUser.id,
                department_id: departmentId,
                nomor_pegawai: payload.nomor_pegawai || empNumber,
                nomor_pkwt: payload.nomor_pkwt || '',
                nama_lengkap: nama,
                perusahaan: payload.perusahaan || 'PT DEA GLOBAL NIAGA',
                penempatan: payload.penempatan || 'Site BIB',
                jabatan: payload.jabatan || 'Staff',
                level: payload.level || 'LEVEL 6 (ENGINEER/TEKNISI)',
                status_karyawan: payload.status_karyawan || 'Aktif',
                nik: payload.nik || null,
                tempat_lahir: payload.tempat_lahir || '',
                tanggal_lahir: payload.tanggal_lahir || null,
                alamat: payload.alamat || '',
                pendidikan: payload.pendidikan || '',
                jurusan: payload.jurusan || '',
                status_perkawinan: payload.status_perkawinan || '',
                agama: payload.agama || '',
                no_handphone: payload.no_handphone || '',
                join_date: payload.join_date || new Date().toISOString().split('T')[0],
                roster_type: payload.roster_type || '8/2'
            })
            .select('id')
            .single();

        if (empErr) throw empErr;

        // 3. Create Employee Details
        await supabase.from('employee_details').insert({
            employee_id: newEmployee.id,
            email_office: email_office || '',
            status_pajak: payload.status_pajak || 'TK/0',
            npwp: payload.npwp || '',
            nomor_kpj: payload.nomor_kpj || '',
            nomor_jkn: payload.nomor_jkn || '',
            kontak_darurat_nama: payload.kontak_darurat || '',
            kontak_darurat_hubungan: payload.hubungan || '',
            kontak_darurat_nomor: payload.kontak_darurat_nomor || '',
            nama_bank: payload.nama_bank || 'BCA',
            nama_rekening: payload.nama_rekening || nama,
            nomor_rekening: payload.nomor_rekening || '',
            cost_center: payload.cost_center || ''
        });

        // 4. Process Uploaded Documents purely in database table with compression
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const docType = file.fieldname.replace('_file', '').toUpperCase();
                const compressedDataUri = await processUploadedFile(file);
                
                if (compressedDataUri) {
                    await supabase.from('employee_documents').insert({
                        employee_id: newEmployee.id,
                        document_type: docType,
                        file_url: compressedDataUri
                    });
                }
            }
        }

        // 5. Send Real-Time Notification to Super Admin for Verification
        try {
            await supabase.from('notifications').insert({
                target_role: 'superadmin',
                title: 'Pendaftaran Akun Baru Memerlukan Verifikasi',
                message: `Karyawan baru mendaftar: ${nama} (${username} - Dept: ${payload.department || '-'}). Harap verifikasi data untuk menyetujui aktivasi akun.`,
                type: 'verification_request',
                link: '/organization'
            });
        } catch (notifErr) {
            console.error('Notification error on signup:', notifErr);
        }

        res.status(201).json({
            message: 'Pendaftaran akun berhasil! Akun Anda sedang dalam proses verifikasi oleh Super Admin untuk mencegah kesalahan data. Silakan tunggu persetujuan sebelum dapat login.',
            user: { username, nama }
        });
    } catch (err) {
        console.error('Signup Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    // Note: Turnstile is handled by turnstileMiddleware before reaching here.
    const rawIdentifier = req.body.nama || req.body.identifier || req.body.username;
    const { password, deviceId, mfaToken, faceDescriptor } = req.body;

    if (!rawIdentifier || (!password && !faceDescriptor)) {
        return res.status(400).json({ message: 'Username/Email dan kata sandi wajib diisi' });
    }

    const namaIdentifier = String(rawIdentifier).trim();
    const cleanIdentifier = namaIdentifier.replace(/\s+/g, '').toLowerCase();

    try {
        // 1. Exact Match on Username or Email (Highest Priority)
        let { data: exactUsers } = await supabase
            .from('users')
            .select(`
                *,
                roles (name)
            `)
            .or(`username.ilike.${namaIdentifier},email.ilike.${namaIdentifier}`);

        let user = null;
        if (exactUsers && exactUsers.length > 0) {
            user = exactUsers.find(u => u.username?.toLowerCase() === namaIdentifier.toLowerCase()) 
                || exactUsers.find(u => u.email?.toLowerCase() === namaIdentifier.toLowerCase()) 
                || exactUsers[0];
        }

        // 2. Exact Match in Employees table (by Full Name or Employee ID)
        if (!user) {
            const { data: exactEmps } = await supabase
                .from('employees')
                .select('user_id, nama_lengkap, nomor_pegawai')
                .or(`nama_lengkap.ilike.${namaIdentifier},nomor_pegawai.ilike.${namaIdentifier}`);

            if (exactEmps && exactEmps.length > 0) {
                const targetUserId = exactEmps[0].user_id;
                if (targetUserId) {
                    const { data: uData } = await supabase.from('users').select('*, roles(name)').eq('id', targetUserId).maybeSingle();
                    user = uData;
                }
            }
        }

        // 3. Fuzzy match in Employees (e.g. "Della Marcelina" matching "Della Marcelina Susanty")
        if (!user && namaIdentifier.length >= 3) {
            const { data: fuzzyEmps } = await supabase
                .from('employees')
                .select('user_id, nama_lengkap, nomor_pegawai')
                .or(`nama_lengkap.ilike.%${namaIdentifier}%,nomor_pegawai.ilike.%${namaIdentifier}%`);

            if (fuzzyEmps && fuzzyEmps.length > 0) {
                const targetUserId = fuzzyEmps[0].user_id;
                if (targetUserId) {
                    const { data: uData } = await supabase.from('users').select('*, roles(name)').eq('id', targetUserId).maybeSingle();
                    user = uData;
                }
            }
        }

        // 4. Cleaned username match only if no exact user found and length >= 6
        if (!user && cleanIdentifier.length >= 6) {
            const { data: fuzzyUsers } = await supabase
                .from('users')
                .select('*, roles(name)')
                .ilike('username', `%${cleanIdentifier}%`);

            if (fuzzyUsers && fuzzyUsers.length > 0) {
                user = fuzzyUsers[0];
            }
        }

        if (!user) {
            return res.status(401).json({ message: 'Akun atau kredensial pengguna tidak ditemukan dalam sistem.' });
        }

        // Validate Password OR Face Descriptor
        // Face recognition logic will compare the incoming faceDescriptor with DB if provided
        if (faceDescriptor) {
            const { data: empData } = await supabase.from('employees').select('face_descriptor').eq('user_id', user.id).single();
            if (!empData || !empData.face_descriptor) {
                return res.status(401).json({ message: 'Face not enrolled for this user' });
            }
            
            const dbDescriptor = JSON.parse(empData.face_descriptor);
            const incomingDescriptor = JSON.parse(faceDescriptor);
            
            // Euclidean distance calculation
            let distance = 0;
            for (let i = 0; i < dbDescriptor.length; i++) {
                distance += Math.pow(dbDescriptor[i] - incomingDescriptor[i], 2);
            }
            distance = Math.sqrt(distance);

            if (distance > 0.45) { // Threshold for face-api.js (usually 0.4 to 0.5)
                return res.status(401).json({ message: 'Face not recognized' });
            }
        } else {
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                return res.status(401).json({ message: 'Invalid password' });
            }
        }

        // Check if user account has been verified and activated by Super Admin
        if (user.is_active === false) {
            return res.status(403).json({
                message: 'Akun Anda sedang dalam proses verifikasi oleh Super Admin. Harap tunggu persetujuan sebelum dapat masuk ke sistem.'
            });
        }

        // Handle MFA
        if (user.mfa_enabled) {
            // Need to query trusted devices
            const { data: devices } = await supabase.from('user_trusted_devices').select('*').eq('user_id', user.id);
            const isKnownDevice = deviceId && devices.some(d => d.device_fingerprint === deviceId);

            if (!isKnownDevice) {
                if (!mfaToken) {
                    return res.status(403).json({ requireMfa: true, message: 'MFA required for new device' });
                }
                const verified = speakeasy.totp.verify({
                    secret: user.mfa_secret,
                    encoding: 'base32',
                    token: mfaToken
                });
                if (!verified) {
                    return res.status(401).json({ message: 'Kode MFA tidak valid' });
                }
            }
        }

        // Track Device & Sesi Login
        const parser = new UAParser(req.headers['user-agent'] || '');
        const uaResult = parser.getResult();
        const browserStr = `${uaResult.browser.name || 'Web Browser'} ${uaResult.browser.version ? uaResult.browser.version.split('.')[0] : ''}`.trim();
        const osStr = `${uaResult.os.name || 'Unknown OS'} ${uaResult.os.version || ''}`.trim();
        const deviceModel = uaResult.device.vendor ? `${uaResult.device.vendor} ${uaResult.device.model || ''}`.trim() : (uaResult.os.name === 'iOS' ? 'Apple iPhone' : (uaResult.os.name === 'Android' ? 'Android Smartphone' : 'Desktop Workstation'));
        const deviceType = uaResult.device.type || (['iOS', 'Android'].includes(uaResult.os.name) ? 'Mobile' : 'Desktop');
        let clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.ip || req.socket.remoteAddress || '127.0.0.1');
        if (clientIp.startsWith('::ffff:')) {
            clientIp = clientIp.replace('::ffff:', '');
        }
        if (clientIp === '::1') {
            clientIp = '127.0.0.1';
        }
        const clientLocation = req.body.location || 'Kalimantan Selatan, ID';
        const finalDeviceId = deviceId || `dev_${Buffer.from(clientIp + (uaResult.os.name || '') + (uaResult.browser.name || '')).toString('hex').slice(0, 16)}`;

        try {
            // Check if device exists for this user (by device_fingerprint OR by matching device_name + os + browser)
            const { data: userDevices } = await supabase
                .from('user_trusted_devices')
                .select('*')
                .eq('user_id', user.id);

            let existingDevice = null;
            if (userDevices && userDevices.length > 0) {
                existingDevice = userDevices.find(d => d.device_fingerprint === finalDeviceId)
                    || userDevices.find(d => d.os === osStr && d.browser === browserStr && d.device_name === deviceModel);
            }

            // Set previous devices to inactive so only current is marked active
            await supabase.from('user_trusted_devices').update({ is_active: false }).eq('user_id', user.id);

            if (existingDevice) {
                await supabase.from('user_trusted_devices').update({
                    device_fingerprint: finalDeviceId,
                    last_login: new Date().toISOString(),
                    ip: clientIp,
                    location: clientLocation,
                    browser: browserStr,
                    os: osStr,
                    device_name: deviceModel,
                    device_type: deviceType,
                    is_active: true
                }).eq('id', existingDevice.id);
            } else {
                await supabase.from('user_trusted_devices').insert({
                    user_id: user.id,
                    device_fingerprint: finalDeviceId,
                    device_name: deviceModel,
                    device_type: deviceType,
                    browser: browserStr,
                    os: osStr,
                    ip: clientIp,
                    location: clientLocation,
                    is_trusted: true,
                    is_active: true,
                    last_login: new Date().toISOString()
                });

                // Trigger real-time Notification for Super Admin
                await supabase.from('notifications').insert({
                    target_role: 'superadmin',
                    title: 'Perangkat Login Baru Terdeteksi',
                    message: `Akun ${user.username} (${user.roles?.name || 'User'}) login dari ${deviceModel} (${osStr} - ${browserStr}) pada IP ${clientIp}.`,
                    type: 'security_alert',
                    link: '/organization'
                });
            }

            // Insert real Audit Log for Super Admin
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'Otentikasi Login Berhasil',
                details: `Login sesi aktif dari ${deviceModel} (${osStr}, ${browserStr})`,
                ip_address: clientIp,
                user_agent: req.headers['user-agent'] || '',
                status: 'Success'
            });
        } catch (devErr) {
            console.error('Device tracking error:', devErr);
        }

        // 5. Generate Dynamic JWT & HttpOnly Cookie with configured TTL
        const userRole = (user.roles?.name || user.role || 'user').toLowerCase();
        const secConfig = await getSecurityConfig();
        const token = jwt.sign(
            { id: user.id, role: userRole },
            secConfig.jwtSecret,
            { expiresIn: secConfig.jwtExpirySeconds || 18000 }
        );

        setAuthCookie(res, token, (secConfig.jwtExpirySeconds || 18000) * 1000); // Dynamic TTL Cookie

        // Fetch flattened employee details
        const { data: employeeData } = await supabase.from('employees').select('*, departments(name), employee_details(*)').eq('user_id', user.id).single();
        
        let flattenedUser = { ...user, role: userRole };
        delete flattenedUser.password_hash;
        if (employeeData) {
            flattenedUser = { ...flattenedUser, ...employeeData };
            if (employeeData.departments) flattenedUser.department = employeeData.departments.name;
            if (employeeData.employee_details) {
                flattenedUser = { ...flattenedUser, ...(Array.isArray(employeeData.employee_details) ? employeeData.employee_details[0] : employeeData.employee_details) };
            }
            // Explicitly enforce authoritative role from users table
            flattenedUser.role = userRole;
            delete flattenedUser.departments;
            delete flattenedUser.employee_details;
        }

        res.json({
            message: 'Login successful',
            token, // Also sent in body for backward compatibility if needed temporarily
            user: flattenedUser,
            requirePasswordChange: user.must_change_password
        });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.logout = async (req, res) => {
    res.clearCookie('access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });
    res.json({ message: 'Logged out successfully' });
};

exports.getProfile = async (req, res) => {
    try {
        const { data: user } = await supabase.from('users').select('*, roles(name)').eq('id', req.userId).maybeSingle();
        if (!user) return res.status(404).json({ message: "User not found" });

        const userRole = (user.roles?.name || user.role || 'user').toLowerCase();
        const { data: employeeData } = await supabase.from('employees').select('*, departments(name), employee_details(*), employee_documents(*)').eq('user_id', req.userId).maybeSingle();
        
        let flattenedUser = { ...user, role: userRole };
        delete flattenedUser.password_hash;
        if (employeeData) {
            flattenedUser = { ...flattenedUser, ...employeeData };
            if (employeeData.departments) flattenedUser.department = employeeData.departments.name;
            if (employeeData.employee_details && employeeData.employee_details.length > 0) {
                flattenedUser = { ...flattenedUser, ...(Array.isArray(employeeData.employee_details) ? employeeData.employee_details[0] : employeeData.employee_details) };
            }
            if (employeeData.employee_documents) {
                flattenedUser.documents = employeeData.employee_documents;
                const avatarDoc = employeeData.employee_documents.find(d => d.document_type === 'AVATAR' || d.document_type === 'PHOTO');
                if (avatarDoc) {
                    flattenedUser.profile_photo_url = avatarDoc.file_url;
                }
            }
            // Explicitly enforce authoritative role from users table
            flattenedUser.role = userRole;
            delete flattenedUser.departments;
            delete flattenedUser.employee_details;
            delete flattenedUser.employee_documents;
        }

        res.json(flattenedUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    const updates = { ...req.body };
    const employeeUpdates = {};
    const detailUpdates = {};

    // Map common aliases
    const targetName = updates.nama || updates.nama_lengkap;
    if (targetName) {
        employeeUpdates.nama_lengkap = targetName;
    }

    if (updates.no_handphone !== undefined) employeeUpdates.no_handphone = updates.no_handphone;
    if (updates.alamat !== undefined) employeeUpdates.alamat = updates.alamat;
    if (updates.agama !== undefined) employeeUpdates.agama = updates.agama;
    if (updates.status_perkawinan !== undefined) employeeUpdates.status_perkawinan = updates.status_perkawinan;
    if (updates.tempat_lahir !== undefined) employeeUpdates.tempat_lahir = updates.tempat_lahir;
    if (updates.tanggal_lahir !== undefined) employeeUpdates.tanggal_lahir = updates.tanggal_lahir;
    if (updates.pendidikan !== undefined) employeeUpdates.pendidikan = updates.pendidikan;
    if (updates.jurusan !== undefined) employeeUpdates.jurusan = updates.jurusan;

    // Contact details mapping
    if (updates.email_office !== undefined) detailUpdates.email_office = updates.email_office;
    if (updates.kontak_darurat || updates.kontak_darurat_nama) {
        detailUpdates.kontak_darurat_nama = updates.kontak_darurat || updates.kontak_darurat_nama;
    }
    if (updates.kontak_darurat_no || updates.kontak_darurat_nomor) {
        detailUpdates.kontak_darurat_nomor = updates.kontak_darurat_no || updates.kontak_darurat_nomor;
    }
    if (updates.hubungan || updates.kontak_darurat_hubungan) {
        detailUpdates.kontak_darurat_hubungan = updates.hubungan || updates.kontak_darurat_hubungan;
    }

    const targetUserId = req.userId || req.user?.id;
    try {
        // 1. Update user record if email or full_name changed
        const userUpdates = { updated_at: new Date() };
        if (updates.email) userUpdates.email = updates.email;
        if (targetName) userUpdates.full_name = targetName;
        await supabase.from('users').update(userUpdates).eq('id', targetUserId);

        // 2. Find or Create Employee Record
        let { data: emp } = await supabase.from('employees').select('id').eq('user_id', targetUserId).maybeSingle();
        
        if (!emp) {
            // Also try finding employee by matching user email or username
            const { data: userRecord } = await supabase.from('users').select('username, email').eq('id', targetUserId).maybeSingle();
            if (userRecord) {
                const { data: matchedEmp } = await supabase.from('employees').select('id')
                    .or(`nama_lengkap.ilike.%${userRecord.username}%,nomor_pegawai.ilike.%${userRecord.username}%`)
                    .maybeSingle();
                if (matchedEmp) {
                    await supabase.from('employees').update({ user_id: targetUserId }).eq('id', matchedEmp.id);
                    emp = matchedEmp;
                }
            }
        }

        if (!emp) {
            const { data: newEmp } = await supabase.from('employees').insert({
                user_id: targetUserId,
                nama_lengkap: targetName || req.user?.username || 'Karyawan',
                nomor_pegawai: `DGN-${Date.now().toString().slice(-4)}`,
                ...employeeUpdates,
                created_at: new Date(),
                updated_at: new Date()
            }).select('id').maybeSingle();
            emp = newEmp;
        } else if (Object.keys(employeeUpdates).length > 0) {
            employeeUpdates.updated_at = new Date();
            await supabase.from('employees').update(employeeUpdates).eq('id', emp.id);
        }

        // 3. Update Employee Details table
        if (emp && Object.keys(detailUpdates).length > 0) {
            const { data: detail } = await supabase.from('employee_details').select('id').eq('employee_id', emp.id).maybeSingle();
            if (detail) {
                await supabase.from('employee_details').update(detailUpdates).eq('employee_id', emp.id);
            } else {
                await supabase.from('employee_details').insert({ employee_id: emp.id, ...detailUpdates });
            }
        }

        // 4. Invalidate cache
        await invalidateCache('emp:*');
        await invalidateCache('user:*');

        // 5. Process Uploaded Documents / Profile Photos
        if (req.files && req.files.length > 0 && emp) {
            for (const file of req.files) {
                const fieldName = file.fieldname.toLowerCase();
                const compressedDataUri = await processUploadedFile(file);
                if (!compressedDataUri) continue;

                const isAvatar = (fieldName === 'photo' || fieldName === 'profile_photo' || fieldName === 'avatar_file' || fieldName === 'avatar');
                const docType = isAvatar ? 'AVATAR' : file.fieldname.replace('_file', '').toUpperCase();

                const { data: existingDoc } = await supabase
                    .from('employee_documents')
                    .select('id')
                    .eq('employee_id', emp.id)
                    .eq('document_type', docType)
                    .maybeSingle();

                if (existingDoc) {
                    await supabase.from('employee_documents').update({
                        file_url: compressedDataUri,
                        uploaded_at: new Date().toISOString()
                    }).eq('id', existingDoc.id);
                } else {
                    await supabase.from('employee_documents').insert({
                        employee_id: emp.id,
                        document_type: docType,
                        file_url: compressedDataUri
                    });
                }
            }
        }

        // 6. Fetch fresh profile to return
        const { data: user } = await supabase.from('users').select('*, roles(name)').eq('id', targetUserId).maybeSingle();
        const { data: employeeData } = await supabase.from('employees').select('*, departments(name), employee_details(*), employee_documents(*)').eq('user_id', targetUserId).maybeSingle();
        
        let flattenedUser = { ...user, role: user?.roles?.name || 'user' };
        if (employeeData) {
            const { employee_details, employee_documents, departments, ...restEmp } = employeeData;
            flattenedUser = { ...flattenedUser, ...restEmp };
            if (departments) flattenedUser.department = departments.name;
            if (employee_details) {
                const det = Array.isArray(employee_details) ? employee_details[0] : employee_details;
                flattenedUser = { ...flattenedUser, ...det };
            }
            if (employee_documents) {
                flattenedUser.documents = employee_documents;
                const avatarDoc = employee_documents.find(d => d.document_type === 'AVATAR' || d.document_type === 'PHOTO');
                if (avatarDoc) {
                    flattenedUser.profile_photo_url = avatarDoc.file_url;
                }
            }
        }

        res.json({ message: "Profil berhasil diperbarui!", user: flattenedUser });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Password baru minimal 6 karakter' });
        }
        const { data: user, error: fetchErr } = await supabase.from('users').select('password_hash').eq('id', req.userId).single();
        if (fetchErr || !user) return res.status(404).json({ message: 'User tidak ditemukan' });

        if (oldPassword && user.password_hash) {
            const isValid = await bcrypt.compare(oldPassword, user.password_hash);
            if (!isValid) return res.status(400).json({ message: 'Password lama tidak sesuai' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const { error: updateErr } = await supabase.from('users').update({ 
            password_hash: hashedPassword, 
            must_change_password: false,
            updated_at: new Date()
        }).eq('id', req.userId);

        if (updateErr) throw updateErr;

        res.json({ message: 'Password berhasil diubah!' });
    } catch (err) {
        console.error('changePassword error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.changeUsername = async (req, res) => {
    const { newUsername, password } = req.body;
    const targetUserId = req.userId || req.user?.id;

    if (!newUsername || String(newUsername).trim().length < 3) {
        return res.status(400).json({ message: 'Username baru minimal 3 karakter.' });
    }

    const cleanUsername = String(newUsername).trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
    if (cleanUsername.length < 3) {
        return res.status(400).json({ message: 'Username hanya boleh berisi huruf, angka, titik, atau underscore.' });
    }

    try {
        const { data: user, error: fetchErr } = await supabase.from('users').select('id, password_hash').eq('id', targetUserId).maybeSingle();
        if (fetchErr || !user) return res.status(404).json({ message: 'User tidak ditemukan' });

        // If password is provided, verify it
        if (password && user.password_hash) {
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) return res.status(400).json({ message: 'Kata sandi konfirmasi tidak sesuai' });
        }

        // Check if username is already taken by another account
        const { data: existing } = await supabase.from('users').select('id').ilike('username', cleanUsername).maybeSingle();
        if (existing && existing.id !== targetUserId) {
            return res.status(400).json({ message: `Username "${cleanUsername}" sudah digunakan oleh akun lain.` });
        }

        const { error: updateErr } = await supabase.from('users').update({
            username: cleanUsername,
            updated_at: new Date()
        }).eq('id', targetUserId);

        if (updateErr) throw updateErr;

        await invalidateCache('user:*');
        await invalidateCache('emp:*');

        res.json({ message: 'Username berhasil diperbarui!', username: cleanUsername });
    } catch (err) {
        console.error('changeUsername error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getUserDevices = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_trusted_devices')
            .select('*')
            .eq('user_id', req.userId)
            .order('last_login', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.removeUserDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('user_trusted_devices')
            .delete()
            .eq('id', id)
            .eq('user_id', req.userId);

        if (error) throw error;
        res.json({ message: 'Perangkat berhasil diputus dan dihapus dari akun' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.setupPassword = async (req, res) => {
    const { newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await supabase.from('users').update({ password_hash: hashedPassword, must_change_password: false }).eq('id', req.userId);
        res.json({ message: 'Password setup completed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.requestMfa = async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({ length: 20 });
        const { data: user } = await supabase.from('users').select('username').eq('id', req.userId).single();
        
        await supabase.from('users').update({ mfa_secret: secret.base32 }).eq('id', req.userId);
        
        const url = speakeasy.otpauthURL({ secret: secret.ascii, label: `HRIS:${user.username}`, issuer: 'PT DEA GLOBAL NIAGA' });
        QRCode.toDataURL(url, (err, data_url) => {
            if (err) throw err;
            res.json({ qrCodeUrl: data_url, secret: secret.base32 });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.verifyMfa = async (req, res) => {
    const { token } = req.body;
    try {
        const { data: user } = await supabase.from('users').select('mfa_secret').eq('id', req.userId).single();
        const verified = speakeasy.totp.verify({ secret: user.mfa_secret, encoding: 'base32', token });
        if (verified) {
            await supabase.from('users').update({ mfa_enabled: true }).eq('id', req.userId);
            res.json({ message: 'MFA setup verified and enabled' });
        } else {
            res.status(400).json({ message: 'Invalid token' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.disableMfa = async (req, res) => {
    try {
        await supabase.from('users').update({ mfa_enabled: false, mfa_secret: null }).eq('id', req.userId);
        res.json({ message: 'MFA berhasil dinonaktifkan' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.saveRecoveryEmail = async (req, res) => {
    const { email } = req.body;
    try {
        await supabase.from('users').update({ recovery_email: email }).eq('id', req.userId);
        res.json({ message: 'Email pemulihan berhasil disimpan' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getUserDevices = async (req, res) => {
    try {
        const { data } = await supabase.from('user_trusted_devices').select('*').eq('user_id', req.userId);
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.removeUserDevice = async (req, res) => {
    try {
        await supabase.from('user_trusted_devices').delete().eq('id', req.params.id);
        res.json({ message: 'Perangkat berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.enrollFace = async (req, res) => {
    const { faceDescriptor } = req.body; // Expecting a JSON array of float values
    if (!faceDescriptor) {
        return res.status(400).json({ message: 'Face descriptor is required' });
    }
    try {
        const targetUserId = req.userId || req.user?.id;
        await supabase.from('employees').update({ 
            face_descriptor: JSON.stringify(faceDescriptor),
            updated_at: new Date()
        }).eq('user_id', targetUserId);

        await invalidateCache('master:enrolled_faces');
        await invalidateCache('emp:*');
        await invalidateCache('user:*');
        res.json({ message: 'Data biometrik wajah berhasil didaftarkan!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteFaceDescriptor = async (req, res) => {
    try {
        const targetUserId = req.userId || req.user?.id;
        await supabase.from('employees').update({
            face_descriptor: null,
            updated_at: new Date()
        }).eq('user_id', targetUserId);

        await invalidateCache('master:enrolled_faces');
        await invalidateCache('emp:*');
        await invalidateCache('user:*');

        res.json({ message: 'Data biometrik wajah berhasil direset/dihapus dari sistem.' });
    } catch (err) {
        console.error('deleteFaceDescriptor error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const targetUserId = req.userId || req.user?.id;

        const { data: emp } = await supabase.from('employees').select('id').eq('user_id', targetUserId).maybeSingle();
        
        let query = supabase.from('employee_documents').delete().eq('id', id);
        if (req.userRole !== 'superadmin' && req.userRole !== 'admin' && emp) {
            query = query.eq('employee_id', emp.id);
        }
        
        const { error } = await query;
        if (error) throw error;

        await invalidateCache('emp:*');
        res.json({ message: 'Dokumen berhasil dihapus!' });
    } catch (err) {
        console.error('deleteDocument error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteDocumentByType = async (req, res) => {
    try {
        const { docType } = req.params;
        const targetUserId = req.userId || req.user?.id;

        const { data: emp } = await supabase.from('employees').select('id').eq('user_id', targetUserId).maybeSingle();
        if (!emp) return res.status(404).json({ message: 'Data karyawan tidak ditemukan' });

        const { error } = await supabase
            .from('employee_documents')
            .delete()
            .eq('employee_id', emp.id)
            .ilike('document_type', docType);

        if (error) throw error;
        await invalidateCache('emp:*');
        res.json({ message: `Dokumen ${docType} berhasil dihapus!` });
    } catch (err) {
        console.error('deleteDocumentByType error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Helper to safely find user by username, email, or recovery_email
const findUserForPasswordReset = async (rawIdentifier) => {
    if (!rawIdentifier) return null;
    const identifier = String(rawIdentifier).trim().toLowerCase();

    // 1. By username
    const { data: u1 } = await supabase.from('users').select('*').ilike('username', identifier).maybeSingle();
    if (u1) return u1;

    // 2. By email
    const { data: u2 } = await supabase.from('users').select('*').ilike('email', identifier).maybeSingle();
    if (u2) return u2;

    // 3. By recovery_email
    const { data: u3 } = await supabase.from('users').select('*').ilike('recovery_email', identifier).maybeSingle();
    if (u3) return u3;

    return null;
};

// POST /api/auth/forgot-password (Request 6-digit OTP with 10-Minute Anti-Database Fatigue Cooldown)
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const targetIdentifier = String(email || '').trim();

        if (!targetIdentifier) {
            return res.status(400).json({ message: 'Alamat email atau username wajib diisi' });
        }

        const user = await findUserForPasswordReset(targetIdentifier);

        if (!user) {
            return res.status(404).json({ message: 'Akun dengan email / username tersebut tidak ditemukan dalam sistem.' });
        }

        // 10-Minute Cooldown Check (Anti-Database Fatigue & Rate Limiting)
        const TEN_MINUTES_MS = 10 * 60 * 1000;
        if (user.last_otp_sent_at) {
            const timeSinceLastOtp = Date.now() - new Date(user.last_otp_sent_at).getTime();
            if (timeSinceLastOtp < TEN_MINUTES_MS) {
                const remainingMs = TEN_MINUTES_MS - timeSinceLastOtp;
                const remainingSec = Math.ceil(remainingMs / 1000);
                const minutesLeft = Math.floor(remainingSec / 60);
                const secondsLeft = remainingSec % 60;

                return res.status(429).json({
                    message: `Kode verifikasi baru saja dikirim. Demi keamanan server & database, Anda dapat mengirim ulang kode setelah ${minutesLeft} menit ${secondsLeft} detik.`,
                    cooldownRemainingSeconds: remainingSec
                });
            }
        }

        // Generate 6-digit numeric OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + TEN_MINUTES_MS).toISOString();
        const now = new Date().toISOString();

        // Update database with OTP, Expiration, and Sent Timestamp
        const { error: updateErr } = await supabase
            .from('users')
            .update({
                reset_otp: otpCode,
                reset_otp_expires_at: expiresAt,
                last_otp_sent_at: now
            })
            .eq('id', user.id);

        if (updateErr) throw updateErr;

        // Send Email with 6-digit OTP
        const recipientEmail = user.recovery_email || user.email;
        await mailer.sendPasswordResetOtpEmail(recipientEmail, otpCode, 10);

        // Mask email for security display (e.g. ar***@outlook.co.id)
        const [userPart, domainPart] = (recipientEmail || '').split('@');
        const maskedEmail = userPart && domainPart 
            ? `${userPart.slice(0, 2)}***@${domainPart}` 
            : recipientEmail;

        res.json({
            message: `Kode verifikasi 6 digit telah dikirim ke email ${maskedEmail}. Kode berlaku selama 10 menit.`,
            recipientEmail: maskedEmail,
            cooldownSeconds: 600,
            simulatedOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined
        });

    } catch (err) {
        console.error('forgotPassword error:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/auth/verify-reset-otp (Validate 6-Digit OTP)
exports.verifyResetOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const targetIdentifier = String(email || '').trim();
        const inputOtp = String(otp || '').replace(/\D/g, '').trim();

        if (!targetIdentifier || !inputOtp) {
            return res.status(400).json({ message: 'Email/Username dan 6 digit kode OTP wajib diisi' });
        }

        const user = await findUserForPasswordReset(targetIdentifier);

        if (!user) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        const userOtp = String(user.reset_otp || '').replace(/\D/g, '').trim();

        if (!userOtp || userOtp !== inputOtp) {
            return res.status(400).json({ message: 'Kode OTP tidak valid atau salah. Pastikan Anda memasukkan 6 digit kode terbaru yang dikirim ke email.' });
        }

        if (new Date(user.reset_otp_expires_at).getTime() + 60000 < Date.now()) {
            return res.status(400).json({ message: 'Kode OTP telah kedaluwarsa (batas waktu 10 menit). Silakan minta kode baru.' });
        }

        res.json({ valid: true, message: 'Kode OTP berhasil diverifikasi!' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/auth/reset-password (Set New Password with verified 6-Digit OTP)
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const targetIdentifier = String(email || '').trim();
        const inputOtp = String(otp || '').replace(/\D/g, '').trim();

        if (!targetIdentifier || !inputOtp || !newPassword) {
            return res.status(400).json({ message: 'Email/Username, kode OTP, dan kata sandi baru wajib diisi' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Kata sandi baru minimal 6 karakter' });
        }

        const user = await findUserForPasswordReset(targetIdentifier);

        if (!user) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        const userOtp = String(user.reset_otp || '').replace(/\D/g, '').trim();

        if (!userOtp || userOtp !== inputOtp) {
            return res.status(400).json({ message: 'Kode OTP tidak valid atau salah. Pastikan Anda memasukkan 6 digit kode terbaru yang dikirim ke email.' });
        }

        if (new Date(user.reset_otp_expires_at).getTime() + 60000 < Date.now()) {
            return res.status(400).json({ message: 'Kode OTP telah kedaluwarsa (10 menit). Silakan minta kode baru.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const { error: updateErr } = await supabase
            .from('users')
            .update({
                password_hash: hashedPassword,
                reset_otp: null,
                reset_otp_expires_at: null,
                must_change_password: false,
                updated_at: new Date()
            })
            .eq('id', user.id);

        if (updateErr) throw updateErr;

        res.json({ message: 'Kata sandi berhasil direset! Silakan login dengan kata sandi baru Anda.' });

    } catch (err) {
        console.error('resetPassword error:', err);
        res.status(500).json({ error: err.message });
    }
};
