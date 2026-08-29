const supabase = require('../config/supabase');
const { getOrSetCache, invalidateCache } = require('../utils/cache');
const { notifyRole, createNotification } = require('./notificationController');

// Helper to resolve certificate type ID accurately without mistaking POP/POM for WAH
const resolveCertificateTypeId = async (namaSertifikat, institusiPenerbit = 'K3/HSE') => {
    if (!namaSertifikat || !namaSertifikat.trim()) return 1;
    const raw = namaSertifikat.trim();
    const upper = raw.toUpperCase();
    const lower = raw.toLowerCase();

    // 1. Precise rule-based mapping for standard mining & technical certifications
    if (upper.includes('POP') || lower.includes('pengawas operasional pertama') || lower.includes('pengawas operasional pratama')) {
        return 2; // Pengawas Operasional Pertama (POP)
    }
    if (upper.includes('POM') || lower.includes('pengawas operasional madya')) {
        return 3; // Pengawas Operasional Madya (POM)
    }
    if (upper.includes('POU') || lower.includes('pengawas operasional utama')) {
        const { data: pouType } = await supabase.from('certificate_types').select('id').ilike('code', 'POU').maybeSingle();
        if (pouType) return pouType.id;
    }
    if (upper.includes('AK3U') || lower.includes('ahli k3 umum') || lower.includes('ahli k3 umum (ak3u)')) {
        return 16; // Ahli K3 Umum (AK3U)
    }
    if (upper.includes('AK3 LISTRIK') || lower.includes('ahli k3 listrik')) {
        return 4; // Ahli K3 Listrik
    }
    if (upper.includes('TEKNISI LISTRIK') || (lower.includes('teknisi') && lower.includes('listrik'))) {
        return 5; // Teknisi Listrik
    }
    if (upper.includes('CSMS') || upper.includes('CSMC') || lower.includes('contractor safety')) {
        return 17; // CSMS
    }
    if (upper.includes('SMKP') || lower.includes('smkp minerba')) {
        return 21; // SMKP Minerba
    }
    if (upper.includes('WAH') || lower.includes('working at height') || lower.includes('ketinggian') || upper.includes('TKPK') || upper.includes('TKBT')) {
        if (upper.includes('TKPK 1') || upper.includes('TKPK_1') || upper.includes('TINGKAT 1')) return 6;
        if (upper.includes('TKPK 2') || upper.includes('TKPK_2') || upper.includes('TINGKAT 2')) return 7;
        if (upper.includes('TKBT')) return 8;
        return 1; // Working at Height (WAH)
    }
    if (upper.includes('P3K') || upper.includes('FIRST AID') || lower.includes('pertolongan pertama')) {
        return 9; // First Aid / P3K
    }
    if (upper.includes('DRONE') || lower.includes('pilot drone')) {
        return 10; // Pilot Drone
    }
    if (upper.includes('LOTOTO') || upper.includes('LOTO') || lower.includes('lock out')) {
        return 11; // LOTOTO
    }
    if (upper.includes('FIBER') || upper.includes('FO') || lower.includes('fiber optic')) {
        return 13; // Fiber Optic (FO)
    }
    if (upper.includes('MTCNA') || lower.includes('mikrotik')) {
        return 18; // MTCNA
    }
    if (upper.includes('MTCRE')) {
        return 19; // MTCRE
    }
    if (upper.includes('UBIQUITI') || upper.includes('UBIQUITY')) {
        return 20; // Ubiquiti
    }
    if (upper.includes('DOCUMENT CONTROL') || lower.includes('doc control')) {
        return 24; // Document Control
    }

    // 2. Exact match check from certificate_types table
    const { data: exactType } = await supabase
        .from('certificate_types')
        .select('id')
        .ilike('name', raw)
        .maybeSingle();
    if (exactType) return exactType.id;

    // 3. Exact code check from certificate_types table
    const { data: codeType } = await supabase
        .from('certificate_types')
        .select('id')
        .ilike('code', raw)
        .maybeSingle();
    if (codeType) return codeType.id;

    // 4. Case-insensitive substring match from existing types
    const { data: allTypes } = await supabase.from('certificate_types').select('id, code, name');
    if (allTypes && allTypes.length > 0) {
        const found = allTypes.find(t => {
            const tName = (t.name || '').toLowerCase();
            const tCode = (t.code || '').toLowerCase();
            return tName === lower || 
                   tCode === lower ||
                   (lower.length >= 3 && tName.includes(lower)) ||
                   (lower.length >= 3 && lower.includes(tName));
        });
        if (found) return found.id;
    }

    // 5. Create new certificate type dynamically so user input is preserved faithfully
    const codePrefix = raw.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase() || 'CERT';
    const { data: newType, error: insertTypeErr } = await supabase
        .from('certificate_types')
        .insert({
            code: `${codePrefix}-${Date.now().toString().slice(-4)}`,
            name: raw,
            category: institusiPenerbit || 'K3/HSE'
        })
        .select('id')
        .maybeSingle();

    if (!insertTypeErr && newType) {
        return newType.id;
    }

    return 1;
};

// Helper to format certificate record
const formatCert = (cert) => {
    if (!cert) return null;
    const certType = cert.certificate_types || {};
    const emp = cert.employees || {};
    const deptName = emp.departments?.name || emp.department || 'Operasional';

    // Parse status from status column or notes tag
    let status = 'Approved';
    if (cert.status === 'Rejected' || cert.notes?.includes('[STATUS:REJECTED]')) {
        status = 'Rejected';
    } else if (cert.status === 'Pending' || cert.notes?.includes('[STATUS:PENDING]')) {
        status = 'Pending';
    } else if (cert.status === 'Approved' || cert.notes?.includes('[STATUS:APPROVED]') || cert.is_approved === true) {
        status = 'Approved';
    }

    const isApproved = status === 'Approved';

    // Parse verifier name and verification date if available
    const byMatch = (cert.notes || '').match(/\[VERIFIED_BY:([^\]]+)\]/i) || (cert.notes || '').match(/\[BY:([^\]]+)\]/i);
    const atMatch = (cert.notes || '').match(/\[VERIFIED_AT:([^\]]+)\]/i) || (cert.notes || '').match(/\[AT:([^\]]+)\]/i);
    const reasonMatch = (cert.notes || '').match(/Alasan:\s*([^|\[]+)/i);

    const verifiedBy = byMatch ? byMatch[1].trim() : (status === 'Approved' ? 'HSE Officer Admin' : (status === 'Rejected' ? 'HSE Officer Admin' : null));
    const verifiedAt = atMatch ? atMatch[1].trim() : (status !== 'Pending' ? cert.created_at : null);
    const rejectionReason = reasonMatch ? reasonMatch[1].trim() : null;

    // Clean notes for display
    const cleanNotes = (cert.notes || '')
        .replace(/\[STATUS:(PENDING|APPROVED|REJECTED)\]/g, '')
        .replace(/\[VERIFIED_BY:[^\]]+\]/g, '')
        .replace(/\[VERIFIED_AT:[^\]]+\]/g, '')
        .replace(/Alasan:[^|]+(\|)?/g, '')
        .trim();

    return {
        ...cert,
        id: cert.id,
        status: status,
        is_approved: isApproved,
        is_verified: isApproved,
        verified_by: verifiedBy,
        verified_at: verifiedAt,
        rejection_reason: rejectionReason,
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
            `)
            .order('created_at', { ascending: false });
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

const cleanDate = (d) => {
    if (!d) return null;
    const str = String(d).trim();
    if (!str || str === 'null' || str === 'undefined' || str === '') return null;
    return str;
};

// POST /api/hris/certifications/my-certifications (LinkedIn-style personal upload for all users)
exports.add_my_certification = async (req, res) => {
    try {
        const userId = req.userId;
        let { data: emp } = await supabase.from('employees').select('id, nama_lengkap').eq('user_id', userId).maybeSingle();

        if (!emp) {
            const { data: userRecord } = await supabase.from('users').select('username, email').eq('id', userId).maybeSingle();
            const { data: newEmp } = await supabase.from('employees').insert({
                user_id: userId,
                nama_lengkap: userRecord?.username || 'Karyawan',
                nomor_pegawai: `DGN-${Date.now().toString().slice(-4)}`,
                status_karyawan: 'Aktif'
            }).select('id, nama_lengkap').single();
            emp = newEmp;
        }

        if (!emp) {
            return res.status(400).json({ error: 'Data profil karyawan belum terhubung.' });
        }

        const body = req.body || {};
        const namaSertifikat = body.nama_sertifikat || body.certificate_name || body.nama || 'Sertifikat Kompetensi';
        const institusiPenerbit = body.organisasi_penerbit || body.institusi_penerbit || body.issuer || 'Lembaga Resmi';
        const certNumber = body.certificate_number || body.nomor_sertifikat || `ID-${Date.now().toString().slice(-6)}`;
        const credentialUrl = body.credential_url || body.url || '';
        const isLifetime = body.is_lifetime === 'true' || body.is_lifetime === true || body.is_lifetime === '1' || body.is_lifetime === 1;
        const issueDate = cleanDate(body.issue_date || body.tanggal_diterbitkan);
        const expiredDate = isLifetime ? null : cleanDate(body.expired_date || body.tanggal_kadaluarsa);
        const notes = body.notes || '';

        // Handle uploaded file purely in table with compression
        let fileUrl = null;
        const uploadedFile = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
        if (uploadedFile) {
            const { uploadToSupabaseStorage } = require('../utils/storage');
            fileUrl = await uploadToSupabaseStorage(uploadedFile);
        }

        // Resolve Certificate Type ID with robust matcher
        const certTypeId = await resolveCertificateTypeId(namaSertifikat, institusiPenerbit);

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
                certificate_type_id: certTypeId,
                certificate_number: certNumber,
                is_lifetime: isLifetime,
                issue_date: issueDate,
                expired_date: expiredDate,
                file_url: fileUrl,
                notes: fullNotes
            })
            .select('*, certificate_types(*), employees(*)')
            .single();

        if (error) throw error;

        try {
            await notifyRole('hse_admin', 'Pengajuan Sertifikasi', `Karyawan ${emp.nama_lengkap || ''} telah mengunggah sertifikat baru (${namaSertifikat}). Menunggu verifikasi.`, 'info', '/organization?tab=certifications');
        } catch (nErr) {
            console.warn('Silent notification error in add_my_certification:', nErr.message);
        }

        await invalidateCache('master:certifications_all');
        res.status(201).json({ message: 'Sertifikat berhasil diunggah dan sedang menunggu verifikasi Admin HSE', certificate: formatCert(data) });
    } catch (err) {
        console.error('Add my cert error:', err);
        res.status(500).json({ error: err.message || 'Terjadi kesalahan saat menyimpan sertifikat' });
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

// POST /api/hris/certificate-types (Create new custom certificate type)
exports.create_certificate_type = async (req, res) => {
    try {
        const { name, code, category, description } = req.body || {};
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Nama sertifikasi wajib diisi' });
        }
        const cleanName = name.trim();
        const codePrefix = (code || cleanName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8)).toUpperCase() || 'CERT';
        const finalCode = `${codePrefix}-${Date.now().toString().slice(-4)}`;

        // Check if exact certificate type already exists
        const { data: existing } = await supabase
            .from('certificate_types')
            .select('*')
            .ilike('name', cleanName)
            .maybeSingle();

        if (existing) {
            return res.json(existing);
        }

        const { data: created, error } = await supabase
            .from('certificate_types')
            .insert({
                name: cleanName,
                code: finalCode,
                category: category || 'K3/HSE',
                description: description || null
            })
            .select('*')
            .single();

        if (error) throw error;

        await invalidateCache('master:certifications_all');
        res.status(201).json(created);
    } catch (err) {
        console.error('Create certificate type error:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/hris/certifications (Admin & HSE Management)
exports.add_certification = async (req, res) => {
    try {
        const body = req.body || {};
        let employeeId = body.employee_id || body.user_id;

        // Check if employeeId exists or is a user_id
        if (employeeId) {
            const { data: empCheck } = await supabase.from('employees').select('id').eq('id', employeeId).maybeSingle();
            if (!empCheck) {
                const { data: empByUserId } = await supabase.from('employees').select('id').eq('user_id', employeeId).maybeSingle();
                if (empByUserId) {
                    employeeId = empByUserId.id;
                }
            }
        }

        if (!employeeId) {
            const { data: firstEmp } = await supabase.from('employees').select('id').limit(1).single();
            employeeId = firstEmp?.id;
        }

        const namaSertifikat = body.nama_sertifikat || body.certificate_name || 'Standar K3 WAH/POP';
        const institusiPenerbit = body.institusi_penerbit || body.organisasi_penerbit || 'Kemnaker RI';
        const certNumber = body.certificate_number || body.nomor_sertifikat || `K3-${Date.now().toString().slice(-6)}`;
        const isLifetime = body.is_lifetime === 'true' || body.is_lifetime === true || body.is_lifetime === '1' || body.is_lifetime === 1;
        const issueDate = cleanDate(body.issue_date || body.tanggal_diterbitkan);
        const expiredDate = isLifetime ? null : cleanDate(body.expired_date || body.tanggal_kadaluarsa);
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
            certTypeId = await resolveCertificateTypeId(namaSertifikat, institusiPenerbit);
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
        res.status(500).json({ error: err.message || 'Terjadi kesalahan saat menambahkan sertifikat' });
    }
};

// Helper to extract storage path from a Supabase public URL
const extractStoragePath = (fileUrl, bucketName) => {
    if (!fileUrl || !bucketName) return null;
    try {
        // Public URLs format: ...supabase.co/storage/v1/object/public/<bucket>/<path>
        const marker = `/storage/v1/object/public/${bucketName}/`;
        const idx = fileUrl.indexOf(marker);
        if (idx !== -1) {
            return decodeURIComponent(fileUrl.substring(idx + marker.length));
        }
    } catch (_) {}
    return null;
};

// DELETE /api/hris/certifications/:id
exports.delete_certification = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch the record first to get file_url before deleting
        const { data: cert } = await supabase
            .from('employee_certificates')
            .select('file_url')
            .eq('id', id)
            .maybeSingle();

        // Delete the row from DB
        const { error } = await supabase.from('employee_certificates').delete().eq('id', id);
        if (error) throw error;

        // If there was a file in Supabase Storage, delete it too
        if (cert?.file_url && cert.file_url.startsWith('http')) {
            const buckets = ['certificates', 'documents'];
            for (const bucket of buckets) {
                const filePath = extractStoragePath(cert.file_url, bucket);
                if (filePath) {
                    await supabase.storage.from(bucket).remove([filePath]);
                    break;
                }
            }
        }

        await invalidateCache('master:certifications_all');
        res.json({ message: 'Sertifikat berhasil dihapus beserta file dokumennya.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PATCH /api/hris/certifications/:id/approve (HSE / Admin Approval)
exports.approve_certification = async (req, res) => {
    try {
        const { id } = req.params;

        // Resolve HSE Admin Name
        let adminName = 'HSE Officer Admin';
        if (req.userId) {
            const { data: adminEmp } = await supabase.from('employees').select('nama_lengkap').eq('user_id', req.userId).maybeSingle();
            if (adminEmp && adminEmp.nama_lengkap) {
                adminName = adminEmp.nama_lengkap;
            } else {
                const { data: adminUser } = await supabase.from('users').select('username').eq('id', req.userId).maybeSingle();
                if (adminUser?.username) adminName = adminUser.username;
            }
        }

        // Fetch existing cert to retain metadata
        const { data: currentCert } = await supabase
            .from('employee_certificates')
            .select('notes')
            .eq('id', id)
            .single();

        const currentNotes = (currentCert?.notes || '')
            .replace(/\[STATUS:(PENDING|REJECTED|APPROVED)\]/g, '')
            .replace(/\[VERIFIED_BY:[^\]]+\]/g, '')
            .replace(/\[VERIFIED_AT:[^\]]+\]/g, '')
            .trim();

        const verifiedAtIso = new Date().toISOString();
        const updatedNotes = `[STATUS:APPROVED][VERIFIED_BY:${adminName}][VERIFIED_AT:${verifiedAtIso}] ${currentNotes}`.trim();

        const { data, error } = await supabase
            .from('employee_certificates')
            .update({
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
                message: `Sertifikat ${data.certificate_types?.name || ''} Anda telah disetujui oleh ${adminName}.`,
                type: 'success',
                link: '/personal-certifications'
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

        // Resolve HSE Admin Name
        let adminName = 'HSE Officer Admin';
        if (req.userId) {
            const { data: adminEmp } = await supabase.from('employees').select('nama_lengkap').eq('user_id', req.userId).maybeSingle();
            if (adminEmp && adminEmp.nama_lengkap) {
                adminName = adminEmp.nama_lengkap;
            } else {
                const { data: adminUser } = await supabase.from('users').select('username').eq('id', req.userId).maybeSingle();
                if (adminUser?.username) adminName = adminUser.username;
            }
        }

        const { data: currentCert } = await supabase
            .from('employee_certificates')
            .select('notes')
            .eq('id', id)
            .single();

        const currentNotes = (currentCert?.notes || '')
            .replace(/\[STATUS:(PENDING|REJECTED|APPROVED)\]/g, '')
            .replace(/\[VERIFIED_BY:[^\]]+\]/g, '')
            .replace(/\[VERIFIED_AT:[^\]]+\]/g, '')
            .replace(/Alasan:[^|]+(\|)?/g, '')
            .trim();

        const verifiedAtIso = new Date().toISOString();
        const updatedNotes = `[STATUS:REJECTED][VERIFIED_BY:${adminName}][VERIFIED_AT:${verifiedAtIso}] ${reason ? `Alasan: ${reason} | ` : ''}${currentNotes}`.trim();

        const { data, error } = await supabase
            .from('employee_certificates')
            .update({
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
                message: `Pengajuan sertifikat ${data.certificate_types?.name || ''} ditolak oleh ${adminName}. ${reason ? `Alasan: ${reason}. ` : ''}Silahkan unggah kembali dokumen sertifikat Anda.`,
                type: 'leave_rejected',
                link: '/personal-certifications'
            });
        }

        await invalidateCache('master:certifications_all');
        res.json({ message: 'Permohonan sertifikat telah ditolak.', certificate: formatCert(data) });
    } catch (err) {
        console.error('Reject certificate error:', err);
        res.status(500).json({ error: err.message });
    }
};
