const supabase = require('../config/supabase');
const { getOrSetCache, invalidateCache } = require('../utils/cache');
const { notifyRole, createNotification } = require('./notificationController');

// Helper to format certificate record
const formatCert = (cert) => {
    if (!cert) return null;
    const certType = cert.certificate_types || {};
    const emp = cert.employees || {};
    const deptName = emp.departments?.name || emp.department || 'Operasional';

    // Parse status from status column or notes tag
    let status = cert.status || 'Approved';
    if (cert.notes?.includes('[STATUS:PENDING]')) status = 'Pending';
    else if (cert.notes?.includes('[STATUS:REJECTED]')) status = 'Rejected';
    else if (cert.notes?.includes('[STATUS:APPROVED]')) status = 'Approved';
    else if (cert.is_approved === false) status = 'Pending';

    const isApproved = status === 'Approved';

    // Clean notes for display
    const cleanNotes = (cert.notes || '')
        .replace(/\[STATUS:(PENDING|APPROVED|REJECTED)\]/g, '')
        .trim();

    return {
        ...cert,
        id: cert.id,
        status: status,
        is_approved: isApproved,
        is_verified: isApproved,
        nama_sertifikat: certType.name || cert.nama_sertifikat || 'Sertifikat Kompetensi',
        certificate_name: certType.name || cert.nama_sertifikat || 'Sertifikat Kompetensi',
        kategori: certType.category || 'Umum',
        institusi_penerbit: certType.category || (cleanNotes ? cleanNotes.split(' | ')[0]?.replace('Penerbit: ', '') : 'Lembaga Resmi'),
        nomor_sertifikat: cert.certificate_number,
        tanggal_diterbitkan: cert.issue_date,
        tanggal_kadaluarsa: cert.expired_date,
        file_path: cert.file_url,
        file_url: cert.file_url,
        notes: cleanNotes,
        karyawan: {
            id: emp.id,
            nama: emp.nama_lengkap || emp.nama || 'Karyawan',
            nama_lengkap: emp.nama_lengkap || emp.nama || 'Karyawan',
            nomor_pegawai: emp.nomor_pegawai || '-',
            jabatan: emp.jabatan || '-',
            penempatan: emp.penempatan || 'Site',
            departemen: deptName
        }
    };
};

// GET /api/hris/certifications
exports.get_certifications = async (req, res) => {
    try {
        const { data: certs, error } = await supabase
            .from('employee_certificates')
            .select(`
                id,
                certificate_number,
                is_lifetime,
                issue_date,
                expired_date,
                file_url,
                notes,
                created_at,
                certificate_types (id, code, name, category),
                employees (id, nama_lengkap, nomor_pegawai, jabatan, penempatan, departments(name))
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        const formatted = (certs || []).map(formatCert);
        res.json(formatted);
    } catch (err) {
        console.error('Error get_certifications:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/certifications/matrix
exports.get_matrix = async (req, res) => {
    try {
        const { data: certs, error } = await supabase
            .from('employee_certificates')
            .select(`
                id, certificate_number, is_lifetime, issue_date, expired_date, file_url, notes,
                certificate_types (id, code, name, category),
                employees (id, nama_lengkap, nomor_pegawai, jabatan, penempatan, departments(name))
            `);
        if (error) throw error;
        const formatted = (certs || []).map(formatCert);
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/certifications/my-certifications (For logged-in user)
exports.get_my_certifications = async (req, res) => {
    try {
        const userId = req.userId;
        let { data: emp } = await supabase.from('employees').select('id').eq('user_id', userId).maybeSingle();
        
        if (!emp) {
            return res.json([]);
        }

        const { data: certs, error } = await supabase
            .from('employee_certificates')
            .select(`
                id,
                certificate_number,
                is_lifetime,
                issue_date,
                expired_date,
                file_url,
                notes,
                created_at,
                certificate_types (id, code, name, category)
            `)
            .eq('employee_id', emp.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        const formatted = (certs || []).map(formatCert);
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/hris/certifications/my-certifications (LinkedIn-style personal upload for all users)
exports.add_my_certification = async (req, res) => {
    try {
        const userId = req.userId;
        let { data: emp } = await supabase.from('employees').select('id, nama_lengkap').eq('user_id', userId).maybeSingle();

        if (!emp) {
            const { data: userRecord } = await supabase.from('users').select('username, email').eq('id', userId).single();
            const { data: newEmp } = await supabase.from('employees').insert({
                user_id: userId,
                nama_lengkap: userRecord?.username || 'Karyawan',
                nomor_pegawai: `DGN-${Date.now().toString().slice(-4)}`,
                status_karyawan: 'Aktif'
            }).select('id').single();
            emp = newEmp;
        }

        if (!emp) {
            return res.status(400).json({ error: 'Data profil karyawan belum terhubung.' });
        }

        const body = req.body;
        const namaSertifikat = body.nama_sertifikat || body.certificate_name || body.nama || 'Sertifikat Kompetensi';
        const institusiPenerbit = body.organisasi_penerbit || body.institusi_penerbit || body.issuer || 'Lembaga Resmi';
        const certNumber = body.certificate_number || body.nomor_sertifikat || `ID-${Date.now().toString().slice(-6)}`;
        const credentialUrl = body.credential_url || body.url || '';
        const isLifetime = body.is_lifetime === 'true' || body.is_lifetime === true;
        const issueDate = body.issue_date || body.tanggal_diterbitkan || null;
        const expiredDate = isLifetime ? null : (body.expired_date || body.tanggal_kadaluarsa || null);
        const notes = body.notes || '';

        // Handle uploaded file purely in table with compression
        let fileUrl = null;
        const uploadedFile = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
        if (uploadedFile) {
            const { uploadToSupabaseStorage } = require('../utils/storage');
            fileUrl = await uploadToSupabaseStorage(uploadedFile);
        }

        // Find or create certificate type
        let certTypeId = null;
        if (namaSertifikat) {
            const { data: existingType } = await supabase
                .from('certificate_types')
                .select('id')
                .ilike('name', namaSertifikat.trim())
                .single();

            if (existingType) {
                certTypeId = existingType.id;
            } else {
                const { data: newType } = await supabase
                    .from('certificate_types')
                    .insert({
                        code: `CERT-${Date.now().toString().slice(-4)}`,
                        name: namaSertifikat.trim(),
                        category: institusiPenerbit,
                        description: `Diterbitkan oleh ${institusiPenerbit}`
                    })
                    .select('id')
                    .single();
                certTypeId = newType?.id;
            }
        }

        const fullNotes = [
            '[STATUS:PENDING]',
            institusiPenerbit ? `Penerbit: ${institusiPenerbit}` : null,
            credentialUrl ? `URL: ${credentialUrl}` : null,
            notes ? notes : null
        ].filter(Boolean).join(' | ');

        const { data, error } = await supabase
            .from('employee_certificates')
            .insert({
                employee_id: emp.id,
                certificate_type_id: certTypeId || 1,
                certificate_number: certNumber,
                is_lifetime: isLifetime,
                issue_date: issueDate,
                expired_date: expiredDate,
                file_url: fileUrl,
                status: 'Pending',
                is_approved: false,
                notes: fullNotes
            })
            .select('*, certificate_types(*), employees(*)')
            .single();

        if (error) throw error;

        await notifyRole('hse_admin', 'Pengajuan Sertifikasi', `Karyawan ${emp.nama_lengkap || ''} telah mengunggah sertifikat baru. Menunggu verifikasi.`);

        await invalidateCache('master:certifications_all');
        res.status(201).json({ message: 'Sertifikat berhasil diunggah dan sedang menunggu verifikasi Admin HSE', certificate: formatCert(data) });
    } catch (err) {
        console.error('Add my cert error:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/hris/certificate-types
exports.get_certificate_types = async (req, res) => {
    try {
        const { data: types, error } = await supabase
            .from('certificate_types')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        res.json(types || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/hris/certifications (Admin & HSE Management)
exports.add_certification = async (req, res) => {
    try {
        const body = req.body;
        let employeeId = body.employee_id || body.user_id;

        // Check if employeeId is actually a user_id
        if (employeeId) {
            const { data: empCheck } = await supabase.from('employees').select('id').or(`id.eq.${employeeId},user_id.eq.${employeeId}`).single();
            if (empCheck) {
                employeeId = empCheck.id;
            }
        }

        if (!employeeId) {
            const { data: firstEmp } = await supabase.from('employees').select('id').limit(1).single();
            employeeId = firstEmp?.id;
        }

        const namaSertifikat = body.nama_sertifikat || body.certificate_name || 'Standar K3 WAH/POP';
        const institusiPenerbit = body.institusi_penerbit || body.organisasi_penerbit || 'Kemnaker RI';
        const certNumber = body.certificate_number || body.nomor_sertifikat || `K3-${Date.now().toString().slice(-6)}`;
        const isLifetime = body.is_lifetime === 'true' || body.is_lifetime === true;
        const issueDate = body.issue_date || body.tanggal_diterbitkan || null;
        const expiredDate = isLifetime ? null : (body.expired_date || body.tanggal_kadaluarsa || null);
        const notes = body.notes || '';

        // Handle uploaded file via Supabase Storage Bucket
        let fileUrl = null;
        const uploadedFile = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
        if (uploadedFile) {
            const { uploadToSupabaseStorage } = require('../utils/storage');
            fileUrl = await uploadToSupabaseStorage(uploadedFile, 'certificates');
            if (!fileUrl) {
                fileUrl = await uploadToSupabaseStorage(uploadedFile, 'documents');
            }
        }

        // Certificate type lookup or creation
        let certTypeId = body.certificate_type_id;
        if (!certTypeId && namaSertifikat) {
            const { data: existingType } = await supabase
                .from('certificate_types')
                .select('id')
                .ilike('name', namaSertifikat.trim())
                .single();

            if (existingType) {
                certTypeId = existingType.id;
            } else {
                const { data: newType } = await supabase
                    .from('certificate_types')
                    .insert({
                        code: `K3-${Date.now().toString().slice(-4)}`,
                        name: namaSertifikat.trim(),
                        category: institusiPenerbit,
                        description: `Sertifikasi K3 diterbitkan oleh ${institusiPenerbit}`
                    })
                    .select('id')
                    .single();
                certTypeId = newType?.id;
            }
        }

        const { data, error } = await supabase
            .from('employee_certificates')
            .insert({
                employee_id: employeeId,
                certificate_type_id: certTypeId || 1,
                certificate_number: certNumber,
                is_lifetime: isLifetime,
                issue_date: issueDate,
                expired_date: expiredDate,
                file_url: fileUrl,
                notes: notes || `Penerbit: ${institusiPenerbit}`
            })
            .select('*, certificate_types(*), employees(*)')
            .single();

        if (error) throw error;

        await invalidateCache('master:certifications_all');
        res.status(201).json({ message: 'Sertifikat berhasil ditambahkan', certificate: formatCert(data) });
    } catch (err) {
        console.error('Add certification error:', err);
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/hris/certifications/:id
exports.delete_certification = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('employee_certificates').delete().eq('id', id);
        if (error) throw error;

        await invalidateCache('master:certifications_all');
        res.json({ message: 'Sertifikat berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PATCH /api/hris/certifications/:id/approve (HSE / Admin Approval)
exports.approve_certification = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch existing cert to retain metadata
        const { data: currentCert } = await supabase
            .from('employee_certificates')
            .select('notes')
            .eq('id', id)
            .single();

        const currentNotes = (currentCert?.notes || '')
            .replace(/\[STATUS:(PENDING|REJECTED|APPROVED)\]/g, '')
            .trim();

        const updatedNotes = `[STATUS:APPROVED] ${currentNotes}`.trim();

        const { data, error } = await supabase
            .from('employee_certificates')
            .update({
                status: 'Approved',
                is_approved: true,
                notes: updatedNotes
            })
            .eq('id', id)
            .select('*, certificate_types(*), employees(*)')
            .single();

        if (error) throw error;

        const userId = data.employees?.user_id;
        if (userId) {
            await createNotification({
                userId,
                title: 'Sertifikasi Disetujui',
                message: `Sertifikat ${data.certificate_types?.name || ''} Anda telah disetujui.`
            });
        }

        await invalidateCache('master:certifications_all');
        res.json({ message: 'Sertifikat karyawan berhasil diterima & diverifikasi oleh HSE.', certificate: formatCert(data) });
    } catch (err) {
        console.error('Approve certificate error:', err);
        res.status(500).json({ error: err.message });
    }
};

// PATCH /api/hris/certifications/:id/reject (HSE / Admin Rejection)
exports.reject_certification = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body || {};

        const { data: currentCert } = await supabase
            .from('employee_certificates')
            .select('notes')
            .eq('id', id)
            .single();

        const currentNotes = (currentCert?.notes || '')
            .replace(/\[STATUS:(PENDING|REJECTED|APPROVED)\]/g, '')
            .trim();

        const updatedNotes = `[STATUS:REJECTED] ${reason ? `Alasan: ${reason} | ` : ''}${currentNotes}`.trim();

        const { data, error } = await supabase
            .from('employee_certificates')
            .update({
                status: 'Rejected',
                is_approved: false,
                notes: updatedNotes
            })
            .eq('id', id)
            .select('*, certificate_types(*), employees(*)')
            .single();

        if (error) throw error;

        const userId = data.employees?.user_id;
        if (userId) {
            await createNotification({
                userId,
                title: 'Sertifikasi Ditolak',
                message: `Pengajuan sertifikat ${data.certificate_types?.name || ''} ditolak. Alasan: ${reason || 'Tidak memenuhi syarat'}`
            });
        }

        await invalidateCache('master:certifications_all');
        res.json({ message: 'Permohonan sertifikat telah ditolak.', certificate: formatCert(data) });
    } catch (err) {
        console.error('Reject certificate error:', err);
        res.status(500).json({ error: err.message });
    }
};
