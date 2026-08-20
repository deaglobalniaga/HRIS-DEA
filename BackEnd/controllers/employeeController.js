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
        name: emp.nama_lengkap,
        department: deptName,
        department_name: deptName,
        department_id: emp.department_id,
        role: roleName,
        is_active: emp.users?.is_active ?? true,
        email_office: detail.email_office || emp.users?.email || '',
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
        res.status(500).json({ error: err.message });
    }
};

// POST /api/hris/employees
exports.create_employee = async (req, res) => {
    try {
        const payload = req.body;
        const requestingUserRole = req.userRole || 'admin';

        // Check if trying to create superadmin without privilege
        if ((payload.role === 'superadmin' || payload.role === 'SUPER_ADMIN') && requestingUserRole !== 'superadmin') {
            return res.status(403).json({
                message: 'Hanya Super Admin yang diizinkan untuk membuat akun dengan Role Super Admin!'
            });
        }

        // Get Role ID
        const targetRoleName = (payload.role || 'user').toLowerCase();
        let { data: roleData } = await supabase.from('roles').select('id').ilike('name', targetRoleName).single();
        if (!roleData) {
            const { data: defaultRole } = await supabase.from('roles').select('id').ilike('name', 'user').single();
            roleData = defaultRole;
        }

        // Determine department ID
        let departmentId = payload.department_id || null;
        if (!departmentId && payload.department) {
            let { data: deptData } = await supabase.from('departments').select('id').ilike('name', payload.department.trim()).single();
            if (!deptData) {
                const { data: newDept } = await supabase.from('departments').insert({
                    name: payload.department.trim(),
                    cost_center: payload.cost_center || 'GENERAL'
                }).select('id').single();
                departmentId = newDept?.id;
            } else {
                departmentId = deptData.id;
            }
        }

        // Determine Default Password
        const defaultPassword = payload.password || payload.nik || payload.nomor_pegawai || 'password123';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        const username = payload.username || (payload.nama ? payload.nama.toLowerCase().replace(/[^a-z0-9]/g, '') : `emp_${Date.now()}`);

        // 1. Create User (Pending Super Admin verification)
        const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
                username,
                email: payload.email_office || payload.email || `${username}@deaglobalniaga.com`,
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
                nomor_pegawai: payload.nomor_pegawai || `EMP-${Date.now()}`,
                nomor_pkwt: payload.nomor_pkwt || '',
                nama_lengkap: payload.nama || payload.nama_lengkap || 'Karyawan Baru',
                perusahaan: payload.perusahaan || 'PT DEA GLOBAL NIAGA',
                penempatan: payload.penempatan || 'HO',
                jabatan: payload.jabatan || 'Staff',
                level: payload.level || 'STAFF',
                status_karyawan: payload.status_karyawan || 'Aktif',
                nik: payload.nik || payload.no_ktp || null,
                tempat_lahir: payload.tempat_lahir || '',
                tanggal_lahir: payload.tanggal_lahir || null,
                alamat: payload.alamat || payload.address || '',
                pendidikan: payload.pendidikan || '',
                jurusan: payload.jurusan || '',
                status_perkawinan: payload.status_perkawinan || '',
                agama: payload.agama || '',
                no_handphone: payload.no_handphone || payload.phone || '',
                join_date: payload.join_date || new Date().toISOString().split('T')[0],
                roster_type: payload.roster_type || '8/2',
                cost_center: payload.cost_center || 'GENERAL'
            })
            .select('*')
            .single();

        if (empError) throw empError;

        // 3. Create Employee Details
        await supabase.from('employee_details').insert({
            employee_id: newEmployee.id,
            email_office: payload.email_office || '',
            status_pajak: payload.status_pajak || 'TK/0',
            npwp: payload.npwp || '',
            nomor_kpj: payload.nomor_kpj || '',
            nomor_jkn: payload.nomor_jkn || '',
            kontak_darurat_nama: payload.kontak_darurat_nama || payload.kontak_darurat || '',
            kontak_darurat_nomor: payload.kontak_darurat_nomor || payload.kontak_darurat_no || '',
            kontak_darurat_hubungan: payload.kontak_darurat_hubungan || payload.hubungan || '',
            nama_bank: payload.nama_bank || payload.bank || 'BCA',
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
                        file_name: file.originalname,
                        file_path: fileUrl,
                        file_url: fileUrl,
                        is_verified: true
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
            employee: formatEmployee(newEmployee)
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
            'join_date', 'efektif_resign', 'roster_type', 'cost_center', 'face_descriptor',
            'camera_access', 'gps_access', 'wifi_access'
        ];

        if (updates.nama) empPayload.nama_lengkap = updates.nama;
        if (updates.no_ktp && !updates.nik) empPayload.nik = updates.no_ktp;
        empKeys.forEach(k => {
            if (updates[k] !== undefined && updates[k] !== '') {
                empPayload[k] = updates[k];
            }
        });

        if (updates.department) {
            let { data: deptData } = await supabase.from('departments').select('id').ilike('name', updates.department.trim()).maybeSingle();
            if (!deptData) {
                const { data: newDept } = await supabase.from('departments').insert({
                    name: updates.department.trim(),
                    cost_center: updates.cost_center || 'GENERAL'
                }).select('id').maybeSingle();
                if (newDept) empPayload.department_id = newDept.id;
            } else {
                empPayload.department_id = deptData.id;
            }
        } else if (updates.department_id) {
            empPayload.department_id = updates.department_id;
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
            'nama_bank', 'nama_rekening', 'nomor_rekening'
        ];
        if (updates.kontak_darurat) detailPayload.kontak_darurat_nama = updates.kontak_darurat;
        if (updates.kontak_darurat_no) detailPayload.kontak_darurat_nomor = updates.kontak_darurat_no;
        if (updates.hubungan) detailPayload.kontak_darurat_hubungan = updates.hubungan;
        if (updates.bank) detailPayload.nama_bank = updates.bank;
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
            if (updates.is_active !== undefined) userPayload.is_active = updates.is_active;
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
                            file_name: file.originalname,
                            file_path: fileUrl,
                            file_url: fileUrl,
                            is_verified: true
                        }).eq('id', existingDoc.id);
                    } else {
                        await supabase.from('employee_documents').insert({
                            employee_id: id,
                            document_type: docType,
                            file_name: file.originalname,
                            file_path: fileUrl,
                            file_url: fileUrl,
                            is_verified: true
                        });
                    }
                }
            }
        }

        // Invalidate Caches
        await invalidateCache(`emp:profile:${id}`);
        await invalidateCache('emp:all_employees');
        await invalidateCache('dashboard:*');

        res.json({ message: 'Data karyawan berhasil diperbarui' });
    } catch (err) {
        console.error('Update Employee Error:', err);
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

// POST /api/hris/employees/:id/face-samples
// Save multiple facial samples (JSON array of 128-d Float32 vector arrays)
exports.save_face_samples = async (req, res) => {
    try {
        const { id } = req.params;
        const { face_descriptors } = req.body; // Array of descriptor arrays

        if (!face_descriptors || !Array.isArray(face_descriptors) || face_descriptors.length === 0) {
            return res.status(400).json({ message: 'Face descriptors array is required' });
        }

        const { error } = await supabase
            .from('employees')
            .update({
                face_descriptor: JSON.stringify(face_descriptors),
                updated_at: new Date()
            })
            .eq('id', id);

        if (error) throw error;

        await invalidateCache(`emp:profile:${id}`);
        await invalidateCache('emp:all_employees');
        res.json({ message: 'Sampel wajah berhasil disimpan' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/employees/export/excel
exports.export_employees_excel = async (req, res) => {
    try {
        const { exportToExcelBuffer } = require('../utils/exportUtils');
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

        const buffer = exportToExcelBuffer(formatted, 'Karyawan');
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
                target_role: 'user',
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

        const validRoles = ['user', 'admin', 'superadmin'];
        if (!validRoles.includes(requested_role.toLowerCase())) {
            return res.status(400).json({ message: 'Role yang diajukan tidak valid (harus user, admin, atau superadmin)' });
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
                    target_role: 'user',
                    title: 'Role Akun Anda Telah Diperbarui',
                    message: `Super Admin telah menyetujui perubahan hak akses akun Anda menjadi ${reqData.requested_role.toUpperCase()}.`,
                    type: 'success',
                    link: '/dashboard'
                },
                {
                    user_id: reqData.requested_by,
                    target_role: 'admin',
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
                    target_role: 'admin',
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

