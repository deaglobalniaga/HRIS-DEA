const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { getOrSetCache, invalidateCache } = require('../utils/cache');

// Helper to format employee record from Supabase
const formatEmployee = (emp) => {
    if (!emp) return null;
    let rawRole = (emp.users?.roles?.name || emp.users?.role || 'user').toLowerCase();
    if (['hrga_admin', 'hse_admin', 'hr'].includes(rawRole)) {
        rawRole = 'admin';
    }
    const roleName = rawRole;
    const deptName = emp.departments?.name || emp.department || '';
    const costCenter = emp.departments?.cost_center || emp.cost_center || 'SITE BIB';
    const docs = emp.employee_documents || [];
    const ktpDoc = docs.find(d => (d.document_type || '').toUpperCase() === 'KTP');
    const kkDoc = docs.find(d => (d.document_type || '').toUpperCase() === 'KK');
    const npwpDoc = docs.find(d => (d.document_type || '').toUpperCase() === 'NPWP');
    const ijazahDoc = docs.find(d => (d.document_type || '').toUpperCase() === 'IJAZAH');
    const detail = (emp.employee_details && (Array.isArray(emp.employee_details) ? emp.employee_details[0] : emp.employee_details)) || {};

    const formatted = {
        ...emp,
        ...detail,
        id: emp.id,
        employee_id: emp.id,
        user_id: emp.user_id,
        nama: emp.nama_lengkap,
        nama_lengkap: emp.nama_lengkap,
        full_name: emp.nama_lengkap,
        name: emp.nama_lengkap,
        department: deptName,
        department_name: deptName,
        department_id: emp.department_id,
        cost_center: costCenter,
        role: roleName,
        is_active: emp.users?.is_active ?? true,
        email: emp.users?.email || detail.email_office || '',
        email_office: detail.email_office || emp.users?.email || '',
        kontak_darurat: detail.kontak_darurat_nama || emp.kontak_darurat || '',
        kontak_darurat_nama: detail.kontak_darurat_nama || emp.kontak_darurat || '',
        hubungan: detail.kontak_darurat_hubungan || emp.hubungan || '',
        kontak_darurat_hubungan: detail.kontak_darurat_hubungan || emp.hubungan || '',
        kontak_darurat_nomor: detail.kontak_darurat_nomor || emp.kontak_darurat_nomor || '',
        status_pajak: detail.status_pajak || 'TK/0',
        npwp: detail.npwp || '',
        nomor_kpj: detail.nomor_kpj || '',
        nomor_jkn: detail.nomor_jkn || '',
        nama_bank: detail.nama_bank || 'BCA',
        nama_rekening: detail.nama_rekening || emp.nama_lengkap || '',
        nomor_rekening: detail.nomor_rekening || '',
        nomor_pkwt: emp.nomor_pkwt || '',
        nomor_pegawai: emp.nomor_pegawai || '',
        perusahaan: emp.perusahaan || 'PT DEA GLOBAL NIAGA',
        penempatan: emp.penempatan || 'Site BIB',
        status_karyawan: emp.status_karyawan || 'Aktif',
        level: emp.level || 'LEVEL 6 (ENGINEER/TEKNISI)',
        jabatan: emp.jabatan || 'Staff',
        ktp_file_url: ktpDoc?.file_url || ktpDoc?.file_path || null,
        kk_file_url: kkDoc?.file_url || kkDoc?.file_path || null,
        npwp_file_url: npwpDoc?.file_url || npwpDoc?.file_path || null,
        ijazah_file_url: ijazahDoc?.file_url || ijazahDoc?.file_path || null,
        documents: docs
    };

    delete formatted.departments;
    delete formatted.users;
    delete formatted.employee_details;
    delete formatted.employee_documents;

    return formatted;
};

// GET /api/hris/employees
exports.get_employees = async (req, res) => {
    try {
        const data = await getOrSetCache('emp:all_employees', 60, async () => {
            const { data: employees, error } = await supabase
                .from('employees')
                .select(`
                    *,
                    departments (id, name, cost_center),
                    users (id, username, email, is_active, role_id, roles (id, name)),
                    employee_details (*),
                    employee_documents (*)
                `)
                .order('nama_lengkap', { ascending: true });

            if (error) throw error;
            return (employees || []).map(formatEmployee);
        });

        res.json(data);
    } catch (err) {
        console.error('Error fetching employees:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/employees/:id
exports.get_employee_by_id = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `emp:profile:${id}`;
        
        const data = await getOrSetCache(cacheKey, 3600, async () => {
            const { data: emp, error } = await supabase
                .from('employees')
                .select(`
                    *,
                    departments (id, name, cost_center),
                    users (id, username, email, is_active, role_id, roles (id, name)),
                    employee_details (*),
                    employee_documents (*)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return formatEmployee(emp);
        });

        if (!data) return res.status(404).json({ message: 'Karyawan tidak ditemukan' });
        res.json(data);
    } catch (err) {
        console.error('Error fetching employee by id:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/hris/employees
exports.create_employee = async (req, res) => {
    try {
        const payload = req.body;

        // Validation
        if (!payload.nama && !payload.nama_lengkap) {
            return res.status(400).json({ message: 'Nama lengkap karyawan wajib diisi' });
        }

        // Determine Role ID
        const targetRole = (payload.role || 'user').toLowerCase();
        let { data: roleData } = await supabase.from('roles').select('id').ilike('name', targetRole).maybeSingle();
        if (!roleData) {
            const { data: fallbackRole } = await supabase.from('roles').select('id').ilike('name', 'user').maybeSingle();
            roleData = fallbackRole;
        }

        // Determine department ID
        let departmentId = payload.department_id || null;
        if (!departmentId && payload.department) {
            let { data: deptData } = await supabase.from('departments').select('id, cost_center').ilike('name', payload.department.trim()).maybeSingle();
            if (!deptData) {
                const { data: newDept } = await supabase.from('departments').insert({
                    name: payload.department.trim(),
                    cost_center: payload.cost_center || 'SITE BIB'
                }).select('id').maybeSingle();
                departmentId = newDept?.id;
            } else {
                departmentId = deptData.id;
                if (payload.cost_center && deptData.cost_center !== payload.cost_center) {
                    await supabase.from('departments').update({ cost_center: payload.cost_center }).eq('id', deptData.id);
                }
            }
        }

        // Determine Default Password
        const defaultPassword = payload.password || payload.nik || payload.nomor_pegawai || 'password123';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        
        // Guarantee unique username
        let baseUsername = payload.username 
            ? payload.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') 
            : (payload.nama ? payload.nama.toLowerCase().replace(/[^a-z0-9]/g, '') : `emp_${Date.now()}`);
        if (!baseUsername) baseUsername = `emp_${Date.now()}`;

        let username = baseUsername;
        let counter = 1;
        while (true) {
            const { data: existingU } = await supabase.from('users').select('id').ilike('username', username).maybeSingle();
            if (!existingU) break;
            username = `${baseUsername}${counter}`;
            counter++;
        }

        // Guarantee unique email
        let baseEmail = payload.email_office || payload.email || `${username}@deaglobalniaga.com`;
        let email = baseEmail;
        let emailCounter = 1;
        while (true) {
            const { data: existingEmail } = await supabase.from('users').select('id').ilike('email', email).maybeSingle();
            if (!existingEmail) break;
            const [localPart, domain] = baseEmail.split('@');
            email = `${localPart}${emailCounter}@${domain || 'deaglobalniaga.com'}`;
            emailCounter++;
        }

        // 1. Create User (Pending Super Admin verification)
        const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
                username,
                email,
                password_hash: passwordHash,
                role_id: roleData?.id,
                is_active: false,
                must_change_password: true
            })
            .select('*')
            .single();

        if (userError) throw userError;

        // 2. Create Employee
        const { data: newEmployee, error: empError } = await supabase
            .from('employees')
            .insert({
                user_id: newUser.id,
                department_id: departmentId,
                nomor_pegawai: payload.nomor_pegawai || `EMP-${Date.now().toString().slice(-6)}`,
                nomor_pkwt: payload.nomor_pkwt || '',
                nama_lengkap: payload.nama || payload.nama_lengkap || 'Karyawan Baru',
                perusahaan: payload.perusahaan || 'PT DEA GLOBAL NIAGA',
                penempatan: payload.penempatan || 'Site BIB',
                jabatan: payload.jabatan || 'Staff',
                level: payload.level || 'LEVEL 6 (ENGINEER/TEKNISI)',
                status_karyawan: payload.status_karyawan || 'Aktif',
                nik: payload.nik || payload.no_ktp || null,
                tempat_lahir: payload.tempat_lahir || '',
                tanggal_lahir: payload.tanggal_lahir || null,
                alamat: payload.alamat || payload.address || '',
                pendidikan: payload.pendidikan || 'S1',
                jurusan: payload.jurusan || '',
                status_perkawinan: payload.status_perkawinan || 'TK/0',
                agama: payload.agama || 'Islam',
                no_handphone: payload.no_handphone || payload.phone || '',
                join_date: payload.join_date || new Date().toISOString().split('T')[0]
            })
            .select('*')
            .single();

        if (empError) throw empError;

        // 3. Create Employee Details
        await supabase.from('employee_details').insert({
            employee_id: newEmployee.id,
            email_office: email,
            status_pajak: payload.status_pajak || 'TK/0',
            npwp: payload.npwp || '',
            nomor_kpj: payload.nomor_kpj || '',
            nomor_jkn: payload.nomor_jkn || '',
            kontak_darurat_nama: payload.kontak_darurat_nama || payload.kontak_darurat || '',
            kontak_darurat_nomor: payload.kontak_darurat_nomor || payload.kontak_darurat_no || '',
            kontak_darurat_hubungan: payload.kontak_darurat_hubungan || payload.hubungan || '',
            nama_rekening: payload.nama_rekening || payload.nama || '',
            nomor_rekening: payload.nomor_rekening || ''
        });

        // 4. Handle Uploaded Files (Direct to Supabase Storage Bucket)
        if (req.files && req.files.length > 0) {
            const { uploadToSupabaseStorage } = require('../utils/storage');
            for (const file of req.files) {
                let docType = 'DOKUMEN';
                if (file.fieldname.includes('ktp')) docType = 'KTP';
                else if (file.fieldname.includes('kk')) docType = 'KK';
                else if (file.fieldname.includes('npwp')) docType = 'NPWP';
                else if (file.fieldname.includes('ijazah')) docType = 'IJAZAH';

                const fileUrl = await uploadToSupabaseStorage(file, 'documents');
                if (fileUrl) {
                    await supabase.from('employee_documents').insert({
                        employee_id: newEmployee.id,
                        document_type: docType,
                        file_url: fileUrl
                    });
                }
            }
        }

        // 5. Send Real-time Notification to Super Admin for Verification
        try {
            await supabase.from('notifications').insert({
                target_role: 'superadmin',
                title: 'Pendaftaran Akun Karyawan Memerlukan Verifikasi',
                message: `Admin HRGA mendaftarkan akun karyawan baru: ${payload.nama || payload.nama_lengkap} (${username}). Harap tinjau & verifikasi aktivasi akun untuk mencegah kesalahan data.`,
                type: 'verification_request',
                link: '/organization'
            });
        } catch (notifErr) {
            console.error('Notification error on employee create:', notifErr);
        }

        // Invalidate Redis caches
        await invalidateCache('emp:*');
        await invalidateCache('dashboard:*');
        await invalidateCache('master:departments');

        res.status(201).json({
            message: 'Karyawan berhasil didaftarkan! Akun saat ini dalam antrean verifikasi oleh Super Admin sebelum aktif.',
            employee: formatEmployee(newEmployee),
            username,
            default_password: defaultPassword
        });
    } catch (err) {
        console.error('Create Employee Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/hris/employees/:id
exports.update_employee = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };
        const requestingUserRole = req.userRole || 'admin';

        // Check if updating to superadmin
        if (updates.role) {
            if ((updates.role === 'superadmin' || updates.role === 'SUPER_ADMIN') && requestingUserRole !== 'superadmin') {
                return res.status(403).json({
                    message: 'Hanya Super Admin yang dapat menaikkan hak akses pengguna menjadi Super Admin!'
                });
            }
        }

        // Fetch current employee (support lookup by employees.id, employees.user_id, employee_details.id, nomor_pegawai, or nik)
        let currentEmp = null;
        let targetEmpId = id;

        // 1. Try finding in employees by id
        try {
            const { data: byEmpId } = await supabase
                .from('employees')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (byEmpId) {
                currentEmp = byEmpId;
                targetEmpId = byEmpId.id;
            }
        } catch (e) {}

        // 2. Try finding in employee_details by id (if integer detail ID was passed)
        if (!currentEmp) {
            try {
                const { data: byDetail } = await supabase
                    .from('employee_details')
                    .select('employee_id')
                    .eq('id', id)
                    .maybeSingle();

                if (byDetail && byDetail.employee_id) {
                    const { data: empByDetail } = await supabase
                        .from('employees')
                        .select('*')
                        .eq('id', byDetail.employee_id)
                        .maybeSingle();
                    if (empByDetail) {
                        currentEmp = empByDetail;
                        targetEmpId = empByDetail.id;
                    }
                }
            } catch (e) {}
        }

        // 3. Try finding by user_id
        if (!currentEmp) {
            try {
                const { data: byUserId } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('user_id', id)
                    .maybeSingle();
                if (byUserId) {
                    currentEmp = byUserId;
                    targetEmpId = byUserId.id;
                }
            } catch (e) {}
        }

        // 4. Try finding by nomor_pegawai or nik
        if (!currentEmp) {
            try {
                const { data: byNomor } = await supabase
                    .from('employees')
                    .select('*')
                    .or(`nomor_pegawai.eq.${id},nik.eq.${id}`)
                    .maybeSingle();
                if (byNomor) {
                    currentEmp = byNomor;
                    targetEmpId = byNomor.id;
                }
            } catch (e) {}
        }

        // 5. Check if user exists in users table directly (e.g. standalone admin/superadmin account)
        if (!currentEmp) {
            try {
                const { data: userRow } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', id)
                    .maybeSingle();

                if (userRow) {
                    if (updates.role) {
                        const { data: roleData } = await supabase.from('roles').select('id').ilike('name', updates.role.toLowerCase()).maybeSingle();
                        if (roleData) {
                            await supabase.from('users').update({ role_id: roleData.id, updated_at: new Date() }).eq('id', id);
                        }
                    }
                    if (updates.is_active !== undefined) {
                        await supabase.from('users').update({ is_active: updates.is_active, updated_at: new Date() }).eq('id', id);
                    }
                    await invalidateCache('emp:*');
                    await invalidateCache('user:*');
                    return res.json({ message: 'Hak akses pengguna berhasil diperbarui' });
                }
            } catch (e) {}
        }

        if (!currentEmp) {
            return res.status(404).json({ message: 'Karyawan tidak ditemukan' });
        }

        // If employee has no linked user_id and role is updated, search for matching user or create user
        if (!currentEmp.user_id && updates.role) {
            const cleanName = (currentEmp.nama_lengkap || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
            const { data: matchedUser } = await supabase
                .from('users')
                .select('id')
                .or(`username.ilike.%${cleanName}%,email.ilike.%${currentEmp.nomor_pegawai || 'xyz'}%`)
                .maybeSingle();

            if (matchedUser) {
                currentEmp.user_id = matchedUser.id;
                await supabase.from('employees').update({ user_id: matchedUser.id }).eq('id', targetEmpId);
            }
        }

        // 1. Update Employee table
        const empPayload = {};
        const empKeys = [
            'nama_lengkap', 'nomor_pegawai', 'nomor_pkwt', 'perusahaan', 'penempatan',
            'jabatan', 'level', 'status_karyawan', 'nik', 'tempat_lahir', 'tanggal_lahir',
            'alamat', 'pendidikan', 'jurusan', 'status_perkawinan', 'agama', 'no_handphone',
            'join_date', 'efektif_resign', 'face_descriptor',
            'camera_access', 'gps_access', 'wifi_access'
        ];

        if (updates.nama || updates.nama_lengkap || updates.full_name) empPayload.nama_lengkap = updates.nama || updates.nama_lengkap || updates.full_name;
        if (updates.no_ktp || updates.nik || updates.nik_internal) empPayload.nik = updates.nik || updates.no_ktp || updates.nik_internal;
        if (updates.no_pkwt || updates.nomor_pkwt || updates.no_kontrak || updates.nomor_kontrak) empPayload.nomor_pkwt = updates.nomor_pkwt || updates.no_pkwt || updates.nomor_kontrak || updates.no_kontrak;
        if (updates.tempat_lahir || updates.birth_place) empPayload.tempat_lahir = updates.tempat_lahir || updates.birth_place;
        if (updates.tanggal_lahir || updates.birth_date) empPayload.tanggal_lahir = updates.tanggal_lahir || updates.birth_date;
        if (updates.alamat || updates.address) empPayload.alamat = updates.alamat || updates.address;
        if (updates.pendidikan || updates.education || updates.pendidikan_terakhir) empPayload.pendidikan = updates.pendidikan || updates.education || updates.pendidikan_terakhir;
        if (updates.jurusan || updates.major) empPayload.jurusan = updates.jurusan || updates.major;
        if (updates.no_handphone || updates.no_hp || updates.phone) empPayload.no_handphone = updates.no_handphone || updates.no_hp || updates.phone;
        empKeys.forEach(k => {
            if (updates[k] !== undefined && updates[k] !== '') {
                empPayload[k] = updates[k];
            }
        });

        if (updates.department) {
            let { data: deptData } = await supabase.from('departments').select('id, cost_center').ilike('name', updates.department.trim()).maybeSingle();
            if (!deptData) {
                const { data: newDept } = await supabase.from('departments').insert({
                    name: updates.department.trim(),
                    cost_center: updates.cost_center || 'SITE BIB'
                }).select('id').maybeSingle();
                if (newDept) empPayload.department_id = newDept.id;
            } else {
                empPayload.department_id = deptData.id;
                if (updates.cost_center) {
                    await supabase.from('departments').update({ cost_center: updates.cost_center }).eq('id', deptData.id);
                }
            }
        } else if (updates.department_id) {
            empPayload.department_id = updates.department_id;
            if (updates.cost_center) {
                await supabase.from('departments').update({ cost_center: updates.cost_center }).eq('id', updates.department_id);
            }
        } else if (currentEmp.department_id && updates.cost_center) {
            await supabase.from('departments').update({ cost_center: updates.cost_center }).eq('id', currentEmp.department_id);
        }

        if (Object.keys(empPayload).length > 0) {
            empPayload.updated_at = new Date();
            const { error: updErr } = await supabase.from('employees').update(empPayload).eq('id', targetEmpId);
            if (updErr) {
                console.error('Error updating employees table:', updErr);
            }
        }

        // 2. Update Employee Details table
        const detailPayload = {};
        const detailKeys = [
            'email_office', 'status_pajak', 'npwp', 'nomor_kpj', 'nomor_jkn',
            'kontak_darurat_nama', 'kontak_darurat_nomor', 'kontak_darurat_hubungan',
            'nama_rekening', 'nomor_rekening'
        ];
        if (updates.kontak_darurat || updates.kontak_darurat_nama) detailPayload.kontak_darurat_nama = updates.kontak_darurat || updates.kontak_darurat_nama;
        if (updates.kontak_darurat_no || updates.kontak_darurat_nomor) detailPayload.kontak_darurat_nomor = updates.kontak_darurat_no || updates.kontak_darurat_nomor;
        if (updates.hubungan || updates.kontak_darurat_hubungan) detailPayload.kontak_darurat_hubungan = updates.hubungan || updates.kontak_darurat_hubungan;
        if (updates.nama_rekening || updates.nama || updates.nama_lengkap) detailPayload.nama_rekening = updates.nama_rekening || updates.nama || updates.nama_lengkap;
        detailKeys.forEach(k => {
            if (updates[k] !== undefined) detailPayload[k] = updates[k];
        });

        if (Object.keys(detailPayload).length > 0) {
            const { data: existingDetail } = await supabase.from('employee_details').select('id').eq('employee_id', targetEmpId).maybeSingle();
            if (existingDetail) {
                await supabase.from('employee_details').update(detailPayload).eq('employee_id', targetEmpId);
            } else {
                await supabase.from('employee_details').insert({ employee_id: targetEmpId, ...detailPayload });
            }
        }

        // 3. Update User table (role, active status)
        if (currentEmp.user_id) {
            const userPayload = {};
            if (updates.role) {
                const { data: roleData } = await supabase.from('roles').select('id').ilike('name', updates.role.toLowerCase()).maybeSingle();
                if (roleData) userPayload.role_id = roleData.id;
            }
            if (updates.is_active !== undefined) {
                userPayload.is_active = updates.is_active === true || updates.is_active === 'true' || updates.is_active === 1;
            }
            if (updates.email_office || updates.email) userPayload.email = updates.email_office || updates.email;

            if (Object.keys(userPayload).length > 0) {
                userPayload.updated_at = new Date();
                await supabase.from('users').update(userPayload).eq('id', currentEmp.user_id);
            }
        }

        // 4. Handle Uploaded Files (Direct to Supabase Storage Bucket)
        if (req.files && req.files.length > 0) {
            const { uploadToSupabaseStorage } = require('../utils/storage');
            for (const file of req.files) {
                let docType = 'DOKUMEN';
                if (file.fieldname.includes('ktp')) docType = 'KTP';
                else if (file.fieldname.includes('kk')) docType = 'KK';
                else if (file.fieldname.includes('npwp')) docType = 'NPWP';
                else if (file.fieldname.includes('ijazah')) docType = 'IJAZAH';

                const fileUrl = await uploadToSupabaseStorage(file, 'documents');
                if (fileUrl) {
                    const { data: existingDoc } = await supabase
                        .from('employee_documents')
                        .select('id')
                        .eq('employee_id', targetEmpId)
                        .eq('document_type', docType)
                        .maybeSingle();

                    if (existingDoc) {
                        await supabase.from('employee_documents').update({
                            file_url: fileUrl
                        }).eq('id', existingDoc.id);
                    } else {
                        await supabase.from('employee_documents').insert({
                            employee_id: targetEmpId,
                            document_type: docType,
                            file_url: fileUrl
                        });
                    }
                }
            }
        }

        // Invalidate Caches
        await invalidateCache('emp:*');
        await invalidateCache('dashboard:*');
        await invalidateCache('master:departments');

        res.json({ message: 'Data karyawan berhasil diperbarui' });
    } catch (err) {
        console.error('Update Employee Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/hris/employees/bulk (Import CSV / Excel)
exports.bulk_create_employees = async (req, res) => {
    try {
        const rawEmployees = req.body.employees || req.body;
        if (!Array.isArray(rawEmployees) || rawEmployees.length === 0) {
            return res.status(400).json({ error: 'Data karyawan tidak ditemukan atau format bukan array' });
        }

        let createdCount = 0;
        let updatedCount = 0;

        for (const raw of rawEmployees) {
            if (!raw || typeof raw !== 'object') continue;

            // Normalized lookup helper (case-insensitive & space/underscore insensitive)
            const getVal = (...keys) => {
                for (const k of keys) {
                    if (raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== '') {
                        return String(raw[k]).trim();
                    }
                    const matchKey = Object.keys(raw).find(rk => 
                        rk.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')
                    );
                    if (matchKey && raw[matchKey] !== undefined && raw[matchKey] !== null && String(raw[matchKey]).trim() !== '') {
                        return String(raw[matchKey]).trim();
                    }
                }
                return '';
            };

            const nama = getVal('nama_lengkap', 'nama', 'full_name', 'name', 'karyawan');
            if (!nama) continue; // Skip empty row

            const nomorPegawai = getVal('nomor_pegawai', 'nomor pegawai', 'nip', 'nik_internal', 'no_pegawai', 'id_pegawai', 'employee_id') || `EMP-${Date.now().toString().slice(-6)}`;
            const nik = getVal('nik', 'no_ktp', 'nomor_ktp', 'no ktp', 'nomor ktp', 'ktp', 'national_id');
            const nomorPkwt = getVal('nomor_pkwt', 'no_pkwt', 'no pkwt', 'nomor pkwt', 'no_kontrak', 'nomor_kontrak', 'kontrak');
            const tempatLahir = getVal('tempat_lahir', 'tempat lahir', 'birth_place', 'pob', 'kota_lahir');
            let tanggalLahir = getVal('tanggal_lahir', 'tanggal lahir', 'birth_date', 'dob', 'tgl_lahir');
            if (tanggalLahir) {
                const parsed = new Date(tanggalLahir);
                if (!isNaN(parsed.getTime())) {
                    tanggalLahir = parsed.toISOString().split('T')[0];
                }
            } else {
                tanggalLahir = null;
            }

            const alamat = getVal('alamat', 'alamat_domisili', 'alamat domisili', 'alamat_ktp', 'address');
            const pendidikan = getVal('pendidikan', 'pendidikan_terakhir', 'pendidikan terakhir', 'education', 'tingkat_pendidikan') || 'S1';
            const jurusan = getVal('jurusan', 'program_studi', 'major');
            const statusPerkawinan = getVal('status_perkawinan', 'status perkawinan', 'status_nikah', 'marital_status') || 'Menikah';
            const agama = getVal('agama', 'religion') || 'Islam';
            const noHandphone = getVal('no_handphone', 'no_hp', 'no hp', 'nomor_hp', 'telepon', 'phone', 'whatsapp');
            const perusahaan = getVal('perusahaan', 'company', 'pt') || 'PT DEA GLOBAL NIAGA';
            const penempatan = getVal('penempatan', 'lokasi', 'site', 'location', 'placement') || 'Site BIB';
            const jabatan = getVal('jabatan', 'posisi', 'job_title', 'position', 'role_title') || 'Staff';
            const level = getVal('level', 'leveling', 'golongan') || 'LEVEL 6 (ENGINEER/TEKNISI)';
            const statusKaryawan = getVal('status_karyawan', 'status karyawan', 'status') || 'Aktif';
            let joinDate = getVal('join_date', 'tanggal_bergabung', 'tgl_bergabung', 'tgl_masuk');
            if (joinDate) {
                const parsed = new Date(joinDate);
                if (!isNaN(parsed.getTime())) joinDate = parsed.toISOString().split('T')[0];
            } else {
                joinDate = new Date().toISOString().split('T')[0];
            }

            const deptName = getVal('department', 'departemen', 'divisi', 'division') || 'Operasional';
            const costCenter = getVal('cost_center', 'cost center') || 'SITE BIB';

            // Find or create department
            let departmentId = null;
            let { data: deptData } = await supabase.from('departments').select('id').ilike('name', deptName).maybeSingle();
            if (!deptData) {
                const { data: newDept } = await supabase.from('departments').insert({
                    name: deptName,
                    cost_center: costCenter
                }).select('id').maybeSingle();
                departmentId = newDept?.id;
            } else {
                departmentId = deptData.id;
            }

            // Employee Details fields
            const emailOffice = getVal('email_office', 'email_kantor', 'work_email');
            const statusPajak = getVal('status_pajak', 'ptkp', 'tax_status') || 'TK/0';
            const npwp = getVal('npwp', 'nomor_npwp');
            const nomorKpj = getVal('nomor_kpj', 'no_kpj', 'kpj', 'bpjs_tk', 'bpjs_ketenagakerjaan');
            const nomorJkn = getVal('nomor_jkn', 'no_jkn', 'jkn', 'bpjs_kes', 'bpjs_kesehatan');
            const kontakDaruratNama = getVal('kontak_darurat_nama', 'kontak_darurat', 'emergency_contact');
            const kontakDaruratNomor = getVal('kontak_darurat_nomor', 'kontak_darurat_no', 'no_kontak_darurat');
            const kontakDaruratHubungan = getVal('kontak_darurat_hubungan', 'hubungan');
            const namaRekening = getVal('nama_rekening', 'atas_nama') || nama;
            const nomorRekening = getVal('nomor_rekening', 'no_rekening', 'no_rek');

            // Check if employee already exists by nomor_pegawai or nik or nama_lengkap
            let existingEmp = null;
            if (nomorPegawai) {
                const { data: byNomor } = await supabase.from('employees').select('id, user_id').ilike('nomor_pegawai', nomorPegawai).maybeSingle();
                if (byNomor) existingEmp = byNomor;
            }
            if (!existingEmp && nik) {
                const { data: byNik } = await supabase.from('employees').select('id, user_id').eq('nik', nik).maybeSingle();
                if (byNik) existingEmp = byNik;
            }
            if (!existingEmp && nama) {
                const { data: byNama } = await supabase.from('employees').select('id, user_id').ilike('nama_lengkap', nama).maybeSingle();
                if (byNama) existingEmp = byNama;
            }

            const empPayload = {
                nama_lengkap: nama,
                nomor_pegawai: nomorPegawai,
                department_id: departmentId,
                perusahaan,
                penempatan,
                jabatan,
                level,
                status_karyawan: statusKaryawan,
                join_date: joinDate,
                updated_at: new Date()
            };
            if (nik) empPayload.nik = nik;
            if (nomorPkwt) empPayload.nomor_pkwt = nomorPkwt;
            if (tempatLahir) empPayload.tempat_lahir = tempatLahir;
            if (tanggalLahir) empPayload.tanggal_lahir = tanggalLahir;
            if (alamat) empPayload.alamat = alamat;
            if (pendidikan) empPayload.pendidikan = pendidikan;
            if (jurusan) empPayload.jurusan = jurusan;
            if (statusPerkawinan) empPayload.status_perkawinan = statusPerkawinan;
            if (agama) empPayload.agama = agama;
            if (noHandphone) empPayload.no_handphone = noHandphone;

            let empId = null;

            if (existingEmp) {
                // Update existing employee
                await supabase.from('employees').update(empPayload).eq('id', existingEmp.id);
                empId = existingEmp.id;
                updatedCount++;
            } else {
                // Create user first
                const baseUser = nama.toLowerCase().replace(/[^a-z0-9]/g, '');
                let username = baseUser || `emp_${Date.now().toString().slice(-4)}`;
                const { data: existingUser } = await supabase.from('users').select('id').ilike('username', username).maybeSingle();
                if (existingUser) username = `${username}_${Date.now().toString().slice(-4)}`;
                
                const email = emailOffice || `${username}@deaglobalniaga.com`;
                const passwordHash = await bcrypt.hash('password123', 10);
                const { data: defaultRole } = await supabase.from('roles').select('id').ilike('name', 'user').maybeSingle();

                const { data: newUser } = await supabase.from('users').insert({
                    username,
                    email,
                    password_hash: passwordHash,
                    role_id: defaultRole?.id,
                    is_active: true
                }).select('id').maybeSingle();

                empPayload.user_id = newUser?.id;
                empPayload.created_at = new Date();
                const { data: newEmp } = await supabase.from('employees').insert(empPayload).select('id').maybeSingle();
                empId = newEmp?.id;
                createdCount++;
            }

            // Update or insert employee_details
            if (empId) {
                const detailPayload = {
                    email_office: emailOffice || '',
                    status_pajak: statusPajak,
                    npwp: npwp || '',
                    nomor_kpj: nomorKpj || '',
                    nomor_jkn: nomorJkn || '',
                    kontak_darurat_nama: kontakDaruratNama || '',
                    kontak_darurat_nomor: kontakDaruratNomor || '',
                    kontak_darurat_hubungan: kontakDaruratHubungan || '',
                    nama_rekening: namaRekening,
                    nomor_rekening: nomorRekening || ''
                };
                const { data: existingDetail } = await supabase.from('employee_details').select('id').eq('employee_id', empId).maybeSingle();
                if (existingDetail) {
                    await supabase.from('employee_details').update(detailPayload).eq('employee_id', empId);
                } else {
                    await supabase.from('employee_details').insert({ employee_id: empId, ...detailPayload });
                }
            }
        }

        await invalidateCache('emp:*');
        await invalidateCache('dashboard:*');
        await invalidateCache('master:departments');

        res.json({
            message: `Bulk import berhasil! ${createdCount} karyawan baru ditambahkan, ${updatedCount} karyawan diperbarui.`,
            createdCount,
            updatedCount
        });
    } catch (err) {
        console.error('Bulk upload error:', err);
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/hris/employees/bulk
exports.bulk_delete_employees = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Daftar ID karyawan tidak valid' });
        }
        const { data: emps } = await supabase.from('employees').select('id, user_id').in('id', ids);
        const userIds = (emps || []).map(e => e.user_id).filter(Boolean);
        
        await supabase.from('employees').delete().in('id', ids);
        if (userIds.length > 0) {
            await supabase.from('users').delete().in('id', userIds);
        }
        await invalidateCache('emp:*');
        await invalidateCache('dashboard:*');
        res.json({ message: `${ids.length} karyawan berhasil dihapus` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/hris/employees/:id
exports.delete_employee = async (req, res) => {
    try {
        const { id } = req.params;
        const { data: emp } = await supabase.from('employees').select('user_id').eq('id', id).single();
        
        await supabase.from('employees').delete().eq('id', id);
        if (emp?.user_id) {
            await supabase.from('users').delete().eq('id', emp.user_id);
        }

        await invalidateCache('emp:*');
        await invalidateCache('dashboard:*');
        res.json({ message: 'Karyawan berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/departments
exports.get_departments = async (req, res) => {
    try {
        const departments = await getOrSetCache('master:departments', 43200, async () => {
            const { data: depts, error } = await supabase
                .from('departments')
                .select(`
                    id,
                    name,
                    cost_center,
                    employees (id, nama_lengkap, jabatan, status_karyawan)
                `);

            if (error) throw error;
            return (depts || []).map(d => ({
                id: d.id,
                name: d.name,
                cost_center: d.cost_center,
                total_employees: d.employees ? d.employees.length : 0,
                employees: d.employees || []
            }));
        });

        res.json(departments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/hris/departments (Create Department - HR & HSE)
exports.create_department = async (req, res) => {
    try {
        const { name, cost_center } = req.body || {};
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Nama departemen wajib diisi' });
        }
        const { data, error } = await supabase
            .from('departments')
            .insert({
                name: name.trim(),
                cost_center: cost_center || 'SITE BIB'
            })
            .select('*')
            .single();

        if (error) throw error;

        try {
            await supabase.from('audit_logs').insert({
                user_id: req.userId || null,
                action: 'Departemen Baru Dibuat',
                details: `Departemen ${name.trim()} (${cost_center || 'SITE BIB'}) berhasil ditambahkan ke struktur.`
            });
        } catch (e) {}

        await invalidateCache('master:departments');
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/hris/departments/:id (Update Department - HR & HSE)
exports.update_department = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, cost_center } = req.body || {};
        const { data, error } = await supabase
            .from('departments')
            .update({
                name: name ? name.trim() : undefined,
                cost_center: cost_center || undefined
            })
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;

        try {
            await supabase.from('audit_logs').insert({
                user_id: req.userId || null,
                action: 'Departemen Diperbarui',
                details: `Departemen #${id} diubah menjadi ${name || '-'} (${cost_center || '-'})`
            });
        } catch (e) {}

        await invalidateCache('master:departments');
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/hris/departments/:id (Delete Department - HR & HSE)
exports.delete_department = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('departments')
            .delete()
            .eq('id', id);

        if (error) throw error;

        try {
            await supabase.from('audit_logs').insert({
                user_id: req.userId || null,
                action: 'Departemen Dihapus',
                details: `Departemen ID #${id} dihapus dari struktur organisasi.`
            });
        } catch (e) {}

        await invalidateCache('master:departments');
        res.json({ message: 'Departemen berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/organization/history (Get structure & department modification log)
exports.get_organization_history = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*, users(username, email)')
            .or('action.ilike.%struktur%,action.ilike.%departemen%,action.ilike.%jabatan%,action.ilike.%posisi%,action.ilike.%karyawan%')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/hris/organization/history (Record chart layout or hierarchy save)
exports.save_organization_chart = async (req, res) => {
    try {
        const { nodes, notes } = req.body || {};
        
        try {
            await supabase.from('audit_logs').insert({
                user_id: req.userId || null,
                action: 'Struktur Organisasi Diperbarui',
                details: notes || `Bagan hierarki struktur organisasi (${nodes ? nodes.length : 0} divisi/posisi) telah diperbarui & disimpan.`
            });
        } catch (e) {}

        res.json({ message: 'Struktur organisasi dan riwayat perubahan berhasil disimpan.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/employees/:id/face-samples
// Retrieve enrolled biometric facial samples for database preview
exports.get_face_samples = async (req, res) => {
    try {
        const { id } = req.params;
        const { data: emp, error } = await supabase
            .from('employees')
            .select('id, nama_lengkap, nomor_pegawai, jabatan, face_descriptor')
            .eq('id', id)
            .single();

        if (error || !emp) {
            return res.status(404).json({ message: 'Data karyawan tidak ditemukan' });
        }

        let sampleCount = 0;
        let images = [];

        if (emp.face_descriptor) {
            try {
                const parsed = typeof emp.face_descriptor === 'string' ? JSON.parse(emp.face_descriptor) : emp.face_descriptor;
                if (Array.isArray(parsed)) {
                    sampleCount = parsed.length;
                } else if (parsed && typeof parsed === 'object') {
                    sampleCount = Array.isArray(parsed.descriptors) ? parsed.descriptors.length : 1;
                    images = Array.isArray(parsed.images) ? parsed.images : [];
                }
            } catch (e) {
                sampleCount = 1;
            }
        }

        res.json({
            employee_id: emp.id,
            nama_lengkap: emp.nama_lengkap,
            nomor_pegawai: emp.nomor_pegawai,
            jabatan: emp.jabatan,
            has_enrolled: !!emp.face_descriptor,
            sample_count: sampleCount,
            images: images
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Helper for Euclidean distance between two 128-d face descriptors
function calculateFaceDistance(desc1, desc2) {
    if (!desc1 || !desc2 || desc1.length !== desc2.length) return 1.0;
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        sum += Math.pow(desc1[i] - desc2[i], 2);
    }
    return Math.sqrt(sum);
}

// POST /api/hris/employees/:id/face-samples
// Save or append multiple facial samples (JSON array of 128-d Float32 vector arrays + preview images)
exports.save_face_samples = async (req, res) => {
    try {
        const { id } = req.params;
        const { face_descriptors, face_images, mode = 'replace' } = req.body; // mode: 'append' | 'replace'

        if (!face_descriptors || !Array.isArray(face_descriptors) || face_descriptors.length === 0) {
            return res.status(400).json({ message: 'Face descriptors array is required' });
        }

        // =========================================================================
        // 🔒 1. BIOMETRIC ANTI-DUPLICATE & ANTI-SPOOFING CONFLICT CHECK
        // Ensures no two employees can register the same face (prevents fraud & joki presensi)
        // =========================================================================
        const { data: otherEmployees, error: fetchErr } = await supabase
            .from('employees')
            .select('id, nama_lengkap, nomor_pegawai, jabatan, face_descriptor')
            .neq('id', id)
            .not('face_descriptor', 'is', null);

        if (!fetchErr && otherEmployees && otherEmployees.length > 0) {
            const DUPLICATE_THRESHOLD = 0.48; // Distance <= 0.48 indicates the exact same person

            for (const otherEmp of otherEmployees) {
                try {
                    const rawOther = typeof otherEmp.face_descriptor === 'string' ? JSON.parse(otherEmp.face_descriptor) : otherEmp.face_descriptor;
                    let otherSamples = [];

                    if (rawOther && typeof rawOther === 'object' && Array.isArray(rawOther.descriptors)) {
                        otherSamples = rawOther.descriptors;
                    } else if (Array.isArray(rawOther)) {
                        otherSamples = Array.isArray(rawOther[0]) ? rawOther : [rawOther];
                    }

                    for (const newSample of face_descriptors) {
                        for (const existingSample of otherSamples) {
                            const distance = calculateFaceDistance(newSample, existingSample);
                            if (distance <= DUPLICATE_THRESHOLD) {
                                const matchPercent = Math.max(86, Math.min(99, Math.round(100 - (distance / 0.52) * 18)));
                                return res.status(409).json({
                                    conflict: true,
                                    message: `⚠️ Proteksi Duplikasi Biometrik: Wajah yang didaftarkan terdeteksi identik (${matchPercent}% kecocokan) dengan karyawan lain: ${otherEmp.nama_lengkap} (${otherEmp.nomor_pegawai || otherEmp.jabatan || 'Karyawan Terdaftar'}). Satu wajah hanya boleh didaftarkan untuk satu karyawan!`
                                });
                            }
                        }
                    }
                } catch (e) {
                    // Ignore parse error
                }
            }
        }

        let finalDescriptors = face_descriptors;
        let finalImages = (face_images && Array.isArray(face_images)) ? face_images : [];

        if (mode === 'append') {
            const { data: existingEmp } = await supabase
                .from('employees')
                .select('face_descriptor')
                .eq('id', id)
                .single();

            if (existingEmp && existingEmp.face_descriptor) {
                try {
                    const parsed = typeof existingEmp.face_descriptor === 'string' ? JSON.parse(existingEmp.face_descriptor) : existingEmp.face_descriptor;
                    let oldDesc = [];
                    let oldImg = [];

                    if (Array.isArray(parsed)) {
                        oldDesc = parsed;
                    } else if (parsed && typeof parsed === 'object') {
                        oldDesc = Array.isArray(parsed.descriptors) ? parsed.descriptors : [];
                        oldImg = Array.isArray(parsed.images) ? parsed.images : [];
                    }

                    finalDescriptors = [...oldDesc, ...face_descriptors].slice(0, 15);
                    finalImages = [...oldImg, ...finalImages].slice(0, 15);
                } catch (e) {
                    console.error('Error appending face descriptors:', e);
                }
            }
        }

        // Store combined object with descriptors and thumbnail preview images (capped at 15)
        const payloadToStore = {
            descriptors: finalDescriptors.slice(0, 15),
            images: finalImages.slice(0, 15)
        };

        const { error } = await supabase
            .from('employees')
            .update({
                face_descriptor: JSON.stringify(payloadToStore),
                updated_at: new Date()
            })
            .eq('id', id);

        if (error) throw error;

        await invalidateCache(`emp:profile:${id}`);
        await invalidateCache('emp:all_employees');
        await invalidateCache('master:enrolled_faces');

        res.json({ 
            message: mode === 'append'
                ? `Berhasil menambahkan ${face_descriptors.length} foto baru (Total: ${payloadToStore.descriptors.length} sampel tersimpan)`
                : `Berhasil mendaftarkan ${face_descriptors.length} sampel biometrik wajah`,
            sample_count: payloadToStore.descriptors.length,
            images: payloadToStore.images
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/hris/employees/:id/face-samples/:index
// Delete a specific photo sample from an employee's face dataset
exports.delete_single_face_sample = async (req, res) => {
    try {
        const { id, index } = req.params;
        const targetIndex = parseInt(index, 10);

        const { data: emp, error } = await supabase
            .from('employees')
            .select('id, nama_lengkap, face_descriptor')
            .eq('id', id)
            .single();

        if (error || !emp) {
            return res.status(404).json({ message: 'Data karyawan tidak ditemukan' });
        }

        if (!emp.face_descriptor) {
            return res.status(400).json({ message: 'Karyawan belum memiliki dataset biometrik wajah' });
        }

        let descriptors = [];
        let images = [];

        try {
            const parsed = typeof emp.face_descriptor === 'string' ? JSON.parse(emp.face_descriptor) : emp.face_descriptor;
            if (Array.isArray(parsed)) {
                descriptors = parsed;
            } else if (parsed && typeof parsed === 'object') {
                descriptors = Array.isArray(parsed.descriptors) ? parsed.descriptors : [];
                images = Array.isArray(parsed.images) ? parsed.images : [];
            }
        } catch (e) {
            return res.status(400).json({ message: 'Format dataset biometrik tidak valid' });
        }

        if (targetIndex < 0 || targetIndex >= descriptors.length) {
            return res.status(400).json({ message: 'Indeks sampel foto tidak ditemukan' });
        }

        descriptors.splice(targetIndex, 1);
        if (images.length > targetIndex) {
            images.splice(targetIndex, 1);
        }

        let newPayload = null;
        if (descriptors.length > 0) {
            newPayload = JSON.stringify({
                descriptors,
                images
            });
        }

        const { error: updateErr } = await supabase
            .from('employees')
            .update({
                face_descriptor: newPayload,
                updated_at: new Date()
            })
            .eq('id', id);

        if (updateErr) throw updateErr;

        await invalidateCache(`emp:profile:${id}`);
        await invalidateCache('emp:all_employees');
        await invalidateCache('master:enrolled_faces');

        res.json({
            message: `Sampel foto #${targetIndex + 1} berhasil dihapus`,
            sample_count: descriptors.length,
            images: images,
            has_enrolled: descriptors.length > 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/employees/export/excel
exports.export_employees_excel = async (req, res) => {
    try {
        const XLSX = require('xlsx');
        const { data: employees } = await supabase
            .from('employees')
            .select(`
                nomor_pegawai,
                nama_lengkap,
                nik,
                jabatan,
                level,
                status_karyawan,
                perusahaan,
                penempatan,
                no_handphone,
                join_date,
                departments (name),
                employee_details (email_office, npwp, nomor_kpj, nomor_jkn, nama_rekening, nomor_rekening)
            `);

        const formatted = (employees || []).map(e => ({
            'No. Pegawai': e.nomor_pegawai,
            'Nama Lengkap': e.nama_lengkap,
            'NIK': e.nik,
            'Departemen': e.departments?.name || '',
            'Jabatan': e.jabatan,
            'Level': e.level,
            'Status': e.status_karyawan,
            'Penempatan': e.penempatan,
            'No HP': e.no_handphone,
            'Email Kantor': e.employee_details?.[0]?.email_office || '',
            'NPWP': e.employee_details?.[0]?.npwp || '',
            'No Rekening': e.employee_details?.[0]?.nomor_rekening || '',
            'Join Date': e.join_date
        }));

        const ws = XLSX.utils.json_to_sheet(formatted);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Karyawan');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Data_Karyawan.xlsx');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/hris/employees/:id/documents/:docType (Delete legal doc from DB and storage)
exports.delete_employee_document = async (req, res) => {
    try {
        const { id, docType } = req.params;
        const normalizedDocType = docType.toUpperCase();

        const { error } = await supabase
            .from('employee_documents')
            .delete()
            .eq('employee_id', id)
            .eq('document_type', normalizedDocType);

        if (error) throw error;

        await invalidateCache(`emp:profile:${id}`);
        await invalidateCache('emp:all_employees');
        await invalidateCache('dashboard:*');

        res.json({ message: `Dokumen ${normalizedDocType} berhasil dihapus dari database.` });
    } catch (err) {
        console.error('Delete employee document error:', err);
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/hris/employees/:id/verify (Super Admin verification and activation)
exports.verify_employee = async (req, res) => {
    try {
        const { id } = req.params;
        const requestingUserRole = (req.userRole || '').toLowerCase();
        const isSuperAdmin = ['superadmin', 'super_admin'].includes(requestingUserRole);

        if (!isSuperAdmin) {
            return res.status(403).json({ message: 'Hanya Super Admin yang berwenang memverifikasi & mengaktifkan akun karyawan baru!' });
        }

        const { data: emp, error: fetchErr } = await supabase.from('employees').select('*, users(*)').eq('id', id).single();
        if (fetchErr || !emp) {
            return res.status(404).json({ message: 'Karyawan tidak ditemukan' });
        }

        if (emp.user_id) {
            await supabase.from('users').update({ is_active: true }).eq('id', emp.user_id);
        }

        // Send confirmation notification to user
        if (emp.user_id) {
            await supabase.from('notifications').insert({
                user_id: emp.user_id,
                target_role: null,
                title: 'Akun Anda Telah Diverifikasi',
                message: `Selamat, akun Anda (${emp.nama_lengkap}) telah diverifikasi dan diaktifkan oleh Super Admin. Anda sekarang dapat masuk ke sistem.`,
                type: 'success',
                link: '/dashboard'
            });
        }

        await invalidateCache('emp:*');
        await invalidateCache('dashboard:*');

        res.json({ message: `Akun ${emp.nama_lengkap} berhasil diverifikasi dan diaktifkan!` });
    } catch (err) {
        console.error('Verify employee error:', err);
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/hris/employees/:id/reject (Super Admin rejects and deletes unverified intruder/data)
exports.reject_employee = async (req, res) => {
    try {
        const { id } = req.params;
        const requestingUserRole = (req.userRole || '').toLowerCase();
        const isSuperAdmin = ['superadmin', 'super_admin'].includes(requestingUserRole);

        if (!isSuperAdmin) {
            return res.status(403).json({ message: 'Hanya Super Admin yang berwenang menolak pendaftaran akun karyawan!' });
        }

        const { data: emp, error: fetchErr } = await supabase.from('employees').select('*, users(*)').eq('id', id).single();
        if (fetchErr || !emp) {
            return res.status(404).json({ message: 'Karyawan tidak ditemukan' });
        }

        const empName = emp.nama_lengkap;
        const userId = emp.user_id;

        // Clean up documents, details, employee, and user
        await supabase.from('employee_documents').delete().eq('employee_id', id);
        await supabase.from('employee_details').delete().eq('employee_id', id);
        await supabase.from('employees').delete().eq('id', id);
        if (userId) {
            await supabase.from('users').delete().eq('id', userId);
        }

        await invalidateCache('emp:*');
        await invalidateCache('dashboard:*');

        res.json({ message: `Pendaftaran akun ${empName} berhasil ditolak dan data telah dibersihkan demi keamanan sistem.` });
    } catch (err) {
        console.error('Reject employee error:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/hris/role-requests (Admin HRGA submits role change request)
exports.create_role_request = async (req, res) => {
    try {
        const { employee_id, requested_role, reason } = req.body;
        const requestingUserId = req.userId;

        if (!employee_id || !requested_role) {
            return res.status(400).json({ message: 'Data karyawan dan role yang diajukan wajib diisi' });
        }

        const validRoles = ['user', 'admin'];
        if (!validRoles.includes(requested_role.toLowerCase())) {
            return res.status(403).json({ message: 'Admin hanya dapat mengajukan promosi ke Admin atau demosi ke User. Hak akses Super Admin hanya dapat dikelola langsung oleh Super Admin.' });
        }

        // Fetch target employee and user
        const { data: emp, error: empErr } = await supabase
            .from('employees')
            .select('*, users(*, roles(*))')
            .eq('id', employee_id)
            .single();

        if (empErr || !emp || !emp.users) {
            return res.status(404).json({ message: 'Karyawan atau akun user tidak ditemukan' });
        }

        const currentRole = emp.users.roles?.name || 'user';

        if (currentRole.toLowerCase() === requested_role.toLowerCase()) {
            return res.status(400).json({ message: `Karyawan sudah memiliki role ${requested_role.toUpperCase()}` });
        }

        // Insert into role_requests table
        const { data: requestRecord, error: insertErr } = await supabase
            .from('role_requests')
            .insert({
                user_id: emp.user_id,
                requested_role: requested_role.toLowerCase(),
                old_role: currentRole.toLowerCase(),
                requested_by: requestingUserId,
                reason: reason || 'Pengajuan perubahan role dari Admin HRGA',
                status: 'pending'
            })
            .select('*')
            .single();

        if (insertErr) throw insertErr;

        // Send real-time notification to Super Admin
        try {
            await supabase.from('notifications').insert({
                target_role: 'superadmin',
                title: 'Pengajuan Perubahan Role Karyawan',
                message: `Admin HRGA mengajukan perubahan role untuk ${emp.nama_lengkap} dari ${currentRole.toUpperCase()} menjadi ${requested_role.toUpperCase()}. Alasan: ${reason || '-'}`,
                type: 'role_request',
                link: '/organization'
            });
        } catch (notifErr) {
            console.error('Notif error on role request:', notifErr);
        }

        res.status(201).json({
            message: `Pengajuan perubahan role untuk ${emp.nama_lengkap} berhasil dikirimkan ke Super Admin!`,
            request: requestRecord
        });
    } catch (err) {
        console.error('Create role request error:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/role-requests
exports.get_role_requests = async (req, res) => {
    try {
        const { data: requests, error } = await supabase
            .from('role_requests')
            .select(`
                *,
                user:users!role_requests_user_id_fkey(id, username, email, employees(id, nama_lengkap, jabatan, department_id, departments(name))),
                requester:users!role_requests_requested_by_fkey(id, username, employees(nama_lengkap)),
                reviewer:users!role_requests_reviewed_by_fkey(id, username, employees(nama_lengkap))
            `)
            .order('created_at', { ascending: false });

        if (error) {
            const { data: fallbackRequests, error: fbErr } = await supabase
                .from('role_requests')
                .select('*')
                .order('created_at', { ascending: false });
            if (fbErr) throw fbErr;
            return res.json(fallbackRequests || []);
        }

        res.json(requests || []);
    } catch (err) {
        console.error('Get role requests error:', err);
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/hris/role-requests/:id/review (Super Admin approves or rejects)
exports.review_role_request = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, review_notes } = req.body;
        const requestingUserRole = (req.userRole || '').toLowerCase();
        const isSuperAdmin = ['superadmin', 'super_admin'].includes(requestingUserRole);

        if (!isSuperAdmin) {
            return res.status(403).json({ message: 'Hanya Super Admin yang berwenang menyetujui atau menolak pengajuan role!' });
        }

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ message: 'Action harus bernilai approve atau reject' });
        }

        const { data: reqData, error: fetchErr } = await supabase
            .from('role_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !reqData) {
            return res.status(404).json({ message: 'Data pengajuan role tidak ditemukan' });
        }

        if (reqData.status !== 'pending') {
            return res.status(400).json({ message: `Pengajuan ini sudah berstatus ${reqData.status}` });
        }

        if (action === 'approve') {
            // Find role ID for requested_role
            const { data: roleRow } = await supabase
                .from('roles')
                .select('id')
                .ilike('name', reqData.requested_role)
                .maybeSingle();

            if (!roleRow) {
                return res.status(400).json({ message: `Role ${reqData.requested_role} tidak ditemukan dalam database` });
            }

            // Update user role
            await supabase
                .from('users')
                .update({ role_id: roleRow.id, updated_at: new Date() })
                .eq('id', reqData.user_id);

            // Update request status to approved
            await supabase
                .from('role_requests')
                .update({
                    status: 'approved',
                    reviewed_by: req.userId,
                    review_notes: review_notes || 'Disetujui oleh Super Admin',
                    updated_at: new Date()
                })
                .eq('id', id);

            // Send notification
            await supabase.from('notifications').insert([
                {
                    user_id: reqData.user_id,
                    target_role: null,
                    title: 'Role Akun Anda Telah Diperbarui',
                    message: `Super Admin telah menyetujui perubahan hak akses akun Anda menjadi ${reqData.requested_role.toUpperCase()}.`,
                    type: 'success',
                    link: '/dashboard'
                },
                {
                    user_id: reqData.requested_by,
                    target_role: null,
                    title: 'Pengajuan Role Disetujui',
                    message: `Pengajuan role untuk karyawan telah disetujui oleh Super Admin.`,
                    type: 'success',
                    link: '/organization'
                }
            ]);

            await invalidateCache('emp:*');
            await invalidateCache('dashboard:*');

            res.json({ message: `Pengajuan role berhasil disetujui! Role pengguna telah diperbarui menjadi ${reqData.requested_role.toUpperCase()}.` });
        } else {
            // Reject
            await supabase
                .from('role_requests')
                .update({
                    status: 'rejected',
                    reviewed_by: req.userId,
                    review_notes: review_notes || 'Ditolak oleh Super Admin',
                    updated_at: new Date()
                })
                .eq('id', id);

            if (reqData.requested_by) {
                await supabase.from('notifications').insert({
                    user_id: reqData.requested_by,
                    target_role: null,
                    title: 'Pengajuan Role Ditolak',
                    message: `Pengajuan role untuk karyawan ditolak oleh Super Admin. Catatan: ${review_notes || '-'}`,
                    type: 'warning',
                    link: '/organization'
                });
            }

            res.json({ message: 'Pengajuan role telah ditolak.' });
        }
    } catch (err) {
        console.error('Review role request error:', err);
        res.status(500).json({ error: err.message });
    }
};

