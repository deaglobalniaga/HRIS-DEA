const supabase = require('../config/supabase');
const { getOrSetCache, invalidateCache } = require('../utils/cache');
const { notifyRole, createNotification } = require('./notificationController');
const mailer = require('../utils/mailer');
const { logAdminActivity } = require('../utils/auditLogger');

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

    // Parse category
    const catMatch = (cert.notes || '').match(/\[CATEGORY:([^\]]+)\]/i);
    const categoryTag = catMatch ? catMatch[1].toUpperCase() : null;
    const isGeneral = categoryTag === 'GENERAL' || 
                      (certType.category || '').toUpperCase().includes('GENERAL') || 
                      (certType.category || '').toUpperCase().includes('UMUM') || 
                      (certType.name || '').toUpperCase().includes('GENERAL') ||
                      (certType.name || '').toUpperCase().includes('UMUM');
    const finalCategory = isGeneral ? 'General' : 'K3';

    // Clean notes for display
    const cleanNotes = (cert.notes || '')
        .replace(/\[STATUS:(PENDING|APPROVED|REJECTED)\]/g, '')
        .replace(/\[CATEGORY:(K3|GENERAL)\]/g, '')
        .replace(/\[VERIFIED_BY:[^\]]+\]/g, '')
        .replace(/\[VERIFIED_AT:[^\]]+\]/g, '')
        .replace(/Alasan:[^|]+(\|)?/g, '')
        .trim();

    // Calculate WITA expiration status
    const { getWitaDateStr } = require('../utils/dateTime');
    const todayStr = getWitaDateStr();
    let expiryStatus = 'Active';
    let statusBadge = 'Aktif';
    let daysRemaining = null;

    if (status === 'Rejected') {
        expiryStatus = 'Rejected';
        statusBadge = isGeneral ? 'Ditolak HRGA' : 'Ditolak HSE';
    } else if (status === 'Pending') {
        expiryStatus = 'Pending';
        statusBadge = isGeneral ? 'Menunggu Verifikasi HRGA' : 'Menunggu Verifikasi HSE';
    } else if (cert.is_lifetime || !cert.expired_date) {
        expiryStatus = 'Lifetime';
        statusBadge = 'Seumur Hidup';
    } else {
        const expDate = new Date(cert.expired_date + 'T00:00:00');
        const todayDate = new Date(todayStr + 'T00:00:00');
        daysRemaining = Math.round((expDate - todayDate) / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
            expiryStatus = 'Expired';
            statusBadge = 'Kedaluwarsa';
        } else if (daysRemaining <= 90) {
            expiryStatus = 'Expiring Soon';
            statusBadge = 'Segera Habis';
        } else {
            expiryStatus = 'Active';
            statusBadge = 'Aktif';
        }
    }

    return {
        ...cert,
        id: cert.id,
        status: status,
        expiry_status: expiryStatus,
        status_badge: statusBadge,
        days_remaining: daysRemaining,
        is_approved: isApproved,
        is_verified: isApproved,
        verified_by: verifiedBy,
        verified_at: verifiedAt,
        rejection_reason: rejectionReason,
        nama_sertifikat: certType.name || cert.nama_sertifikat || 'Sertifikat Kompetensi',
        certificate_name: certType.name || cert.nama_sertifikat || 'Sertifikat Kompetensi',
        kategori: finalCategory,
        category: finalCategory,
        is_general: isGeneral,
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
        const categoryRaw = (body.category || body.kategori || 'K3').toUpperCase();
        const categoryTag = categoryRaw.includes('GENERAL') || categoryRaw.includes('UMUM') ? 'GENERAL' : 'K3';

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
            `[CATEGORY:${categoryTag}]`,
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
            if (categoryTag === 'GENERAL') {
                await notifyRole('hrga_admin', 'Pengajuan Sertifikasi General', `Karyawan ${emp.nama_lengkap || ''} telah mengunggah sertifikat general baru (${namaSertifikat}). Menunggu verifikasi HRGA.`, 'info', '/organization?tab=certifications&subtab=pending');
                
                // Send email notification to registered HRGA Admins for General certs
                mailer.getHrgaAdminEmails(supabase).then(hrgaEmails => {
                    if (hrgaEmails && hrgaEmails.length > 0) {
                        mailer.sendHrgaNewCertUploadEmail({
                            toEmails: hrgaEmails,
                            employeeName: emp.nama_lengkap || req.user?.nama || 'Karyawan',
                            certName: namaSertifikat,
                            certNumber: certNumber,
                            issueDate: issueDate,
                            expiryDate: isLifetime ? 'Seumur Hidup' : (expiredDate || '-')
                        }).catch(err => console.error('HRGA cert email send err:', err.message));
                    }
                }).catch(err => console.error('Resolve HRGA admin emails err:', err.message));
            } else {
                await notifyRole('hse_admin', 'Pengajuan Sertifikasi K3', `Karyawan ${emp.nama_lengkap || ''} telah mengunggah sertifikat K3 baru (${namaSertifikat}). Menunggu verifikasi HSE.`, 'info', '/organization?tab=certifications&subtab=pending');
                
                // Send email notification to registered HSE Admins for K3 certs only
                mailer.getHseAdminEmails(supabase).then(hseEmails => {
                    if (hseEmails && hseEmails.length > 0) {
                        mailer.sendHseNewCertUploadEmail({
                            toEmails: hseEmails,
                            employeeName: emp.nama_lengkap || req.user?.nama || 'Karyawan',
                            certName: namaSertifikat,
                            certNumber: certNumber,
                            issueDate: issueDate,
                            expiryDate: isLifetime ? 'Seumur Hidup' : (expiredDate || '-')
                        }).catch(err => console.error('HSE cert email send err:', err.message));
                    }
                }).catch(err => console.error('Resolve HSE admin emails err:', err.message));
            }
        } catch (nErr) {
            console.warn('Silent notification error in add_my_certification:', nErr.message);
        }

        await invalidateCache('master:certifications_all');
        const verifier = categoryTag === 'GENERAL' ? 'Admin HRGA' : 'Admin HSE';
        res.status(201).json({ message: `Sertifikat berhasil diunggah dan sedang menunggu verifikasi ${verifier}`, certificate: formatCert(data) });
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

        const categoryRaw = (body.category || body.kategori || 'K3').toUpperCase();
        const categoryTag = categoryRaw.includes('GENERAL') || categoryRaw.includes('UMUM') ? 'GENERAL' : 'K3';
        const notesWithTag = `[CATEGORY:${categoryTag}] ${notes || `Penerbit: ${institusiPenerbit}`}`.trim();

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
                notes: notesWithTag
            })
            .select('*, certificate_types(*), employees(*)')
            .single();

        if (error) throw error;

        // Automated Email Notification to responsible Admins (HRGA for General, HSE for K3)
        try {
            const empName = data?.employees?.nama_lengkap || 'Karyawan';
            if (categoryTag === 'GENERAL') {
                mailer.getHrgaAdminEmails(supabase).then(hrgaEmails => {
                    if (hrgaEmails && hrgaEmails.length > 0) {
                        mailer.sendHrgaNewCertUploadEmail({
                            toEmails: hrgaEmails,
                            employeeName: empName,
                            certName: namaSertifikat,
                            certNumber: certNumber,
                            issueDate: issueDate,
                            expiryDate: isLifetime ? 'Seumur Hidup' : (expiredDate || '-')
                        }).catch(err => console.error('HRGA cert email send err:', err.message));
                    }
                }).catch(err => console.error('Resolve HRGA admin emails err:', err.message));
            } else {
                mailer.getHseAdminEmails(supabase).then(hseEmails => {
                    if (hseEmails && hseEmails.length > 0) {
                        mailer.sendHseNewCertUploadEmail({
                            toEmails: hseEmails,
                            employeeName: empName,
                            certName: namaSertifikat,
                            certNumber: certNumber,
                            issueDate: issueDate,
                            expiryDate: isLifetime ? 'Seumur Hidup' : (expiredDate || '-')
                        }).catch(err => console.error('HSE cert email send err:', err.message));
                    }
                }).catch(err => console.error('Resolve HSE admin emails err:', err.message));
            }
        } catch (nErr) {
            console.warn('Silent notification error in add_certification:', nErr.message);
        }

        await invalidateCache('master:certifications_all');

        // Log Admin Audit Trail
        const adminDept = categoryTag === 'GENERAL' ? 'HRGA' : 'HSE';
        await logAdminActivity({
            userId: req.userId,
            action: 'Sertifikasi Ditambahkan',
            details: `Admin ${adminDept} menambahkan sertifikat "${namaSertifikat}" (${certNumber}) untuk karyawan ${data?.employees?.nama_lengkap || 'Karyawan'}.`,
            req
        });

        res.status(201).json({ message: `Sertifikat berhasil ditambahkan oleh Admin ${adminDept}`, certificate: formatCert(data) });
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

        // Fetch the record first to get metadata and file_url before deleting
        const { data: cert } = await supabase
            .from('employee_certificates')
            .select('*, certificate_types(name, category), employees(id, nama_lengkap, nomor_pegawai)')
            .eq('id', id)
            .maybeSingle();

        if (!cert) {
            return res.status(404).json({ message: 'Sertifikat tidak ditemukan' });
        }

        const typeCat = (cert?.certificate_types?.category || '').toLowerCase();
        const typeName = (cert?.certificate_types?.name || '').toLowerCase();
        const rawNotes = (cert?.notes || '').toLowerCase();
        const isGeneral = typeCat.includes('general') || typeCat.includes('umum') || 
                          typeName.includes('general') || typeName.includes('umum') ||
                          rawNotes.includes('[category:general]');
        const deptName = isGeneral ? 'HRGA' : 'HSE';
        const certName = cert?.certificate_types?.name || (isGeneral ? 'Sertifikat Umum' : 'Sertifikat K3');
        const empName = cert?.employees?.nama_lengkap || 'Karyawan';

        // 1. Move file to 'trash' bucket if stored in Supabase storage
        let trashFilePath = null;
        if (cert?.file_url && cert.file_url.startsWith('http')) {
            const buckets = ['certificates', 'documents'];
            for (const bucket of buckets) {
                const filePath = extractStoragePath(cert.file_url, bucket);
                if (filePath) {
                    try {
                        const trashDest = `deleted_${Date.now()}_${filePath.split('/').pop()}`;
                        const { data: fileBlob, error: dlErr } = await supabase.storage.from(bucket).download(filePath);
                        if (!dlErr && fileBlob) {
                            const buffer = Buffer.from(await fileBlob.arrayBuffer());
                            await supabase.storage.from('trash').upload(trashDest, buffer, {
                                contentType: fileBlob.type || 'application/octet-stream',
                                upsert: true
                            });
                            // Remove from active bucket
                            await supabase.storage.from(bucket).remove([filePath]);
                            trashFilePath = trashDest;
                        }
                    } catch (mErr) {
                        console.warn('File move to trash warning:', mErr.message);
                    }
                    break;
                }
            }
        }

        // 2. Insert into file_trash table with 7-day retention period (purge_at = NOW() + 7 days)
        const purgeDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Exactly 1 week / 7 days

        await supabase.from('file_trash').insert({
            source_table: 'employee_certificates',
            source_id: cert.id,
            employee_id: cert.employee_id,
            file_name: certName,
            file_url: cert.file_url,
            trash_file_path: trashFilePath,
            metadata: {
                certificate_number: cert.certificate_number,
                certificate_type: certName,
                category: isGeneral ? 'General' : 'K3',
                employee_name: empName,
                issue_date: cert.issue_date,
                expired_date: cert.expired_date,
                is_lifetime: cert.is_lifetime,
                notes: cert.notes
            },
            deleted_by: req.userId || null,
            deleted_at: new Date().toISOString(),
            purge_at: purgeDate.toISOString(),
            is_purged: false
        });

        // 3. Delete the row from active employee_certificates table
        const { error } = await supabase.from('employee_certificates').delete().eq('id', id);
        if (error) throw error;

        await invalidateCache('master:certifications_all');

        // Log Admin Audit Trail
        await logAdminActivity({
            userId: req.userId,
            action: 'Sertifikasi Dihapus (Trash 7 Hari)',
            details: `Admin ${deptName} menghapus sertifikat "${certName}" (No: ${cert?.certificate_number || '-'}) milik karyawan ${empName}. Berkas dipindahkan ke trash dan akan dibersihkan otomatis setelah 1 minggu (7 hari).`,
            req
        });

        res.json({ 
            message: 'Sertifikat berhasil dihapus dan dipindahkan ke trash. Berkas akan otomatis dibersihkan permanen dari database & storage setelah 1 minggu (7 hari).',
            purge_at: purgeDate.toISOString()
        });
    } catch (err) {
        console.error('Delete certification error:', err);
        res.status(500).json({ error: err.message });
    }
};


// PATCH /api/hris/certifications/:id/approve (HSE / Admin Approval)
exports.approve_certification = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch existing cert first to determine category and retain metadata
        const { data: currentCert } = await supabase
            .from('employee_certificates')
            .select('notes, certificate_types(name, category)')
            .eq('id', id)
            .single();

        const typeCat = (currentCert?.certificate_types?.category || '').toLowerCase();
        const typeName = (currentCert?.certificate_types?.name || '').toLowerCase();
        const rawNotes = (currentCert?.notes || '').toLowerCase();
        const isGeneral = typeCat.includes('general') || typeCat.includes('umum') || 
                          typeName.includes('general') || typeName.includes('umum') ||
                          rawNotes.includes('[category:general]');
        const deptName = isGeneral ? 'HRGA' : 'HSE';

        // Resolve Admin Name
        let adminName = `${deptName} Officer Admin`;
        if (req.userId) {
            const { data: adminEmp } = await supabase.from('employees').select('nama_lengkap').eq('user_id', req.userId).maybeSingle();
            if (adminEmp && adminEmp.nama_lengkap) {
                adminName = adminEmp.nama_lengkap;
            } else {
                const { data: adminUser } = await supabase.from('users').select('username').eq('id', req.userId).maybeSingle();
                if (adminUser?.username) adminName = adminUser.username;
            }
        }

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

            // Send confirmation email to employee
            (async () => {
                try {
                    let empEmail = await mailer.resolveUserPersonalEmail(supabase, { userId, employeeId: data.employees?.id, userObj: data.employees });
                    if (!empEmail) {
                        empEmail = data.employees?.email || data.employees?.email_office || null;
                    }
                    if (!empEmail) {
                        const { data: uData } = await supabase.from('users').select('email, recovery_email').eq('id', userId).maybeSingle();
                        empEmail = uData?.recovery_email || uData?.email;
                    }
                    if (empEmail) {
                        await mailer.sendCertApprovalEmail({
                            toEmail: empEmail,
                            employeeName: data.employees?.nama_lengkap || 'Karyawan',
                            certName: data.certificate_types?.name || (isGeneral ? 'Sertifikat Umum' : 'Sertifikat K3'),
                            certNumber: data.certificate_number || '-',
                            adminName: adminName,
                            certCategory: isGeneral ? 'General' : 'K3',
                            expiryDate: data.is_lifetime ? 'Seumur Hidup' : (data.expired_date || '-')
                        });
                    }

                    // Send verification report to responsible Admins
                    if (isGeneral) {
                        const hrgaEmails = await mailer.getHrgaAdminEmails(supabase);
                        if (hrgaEmails && hrgaEmails.length > 0) {
                            await mailer.sendHrgaCertStatusNotificationEmail({
                                toEmails: hrgaEmails,
                                employeeName: data.employees?.nama_lengkap || 'Karyawan',
                                certName: data.certificate_types?.name || 'Sertifikat Umum',
                                certNumber: data.certificate_number || '-',
                                adminName: adminName,
                                status: 'APPROVED',
                                expiryDate: data.is_lifetime ? 'Seumur Hidup' : (data.expired_date || '-')
                            });
                        }
                    } else {
                        const hseEmails = await mailer.getHseAdminEmails(supabase);
                        if (hseEmails && hseEmails.length > 0) {
                            await mailer.sendHseCertStatusNotificationEmail({
                                toEmails: hseEmails,
                                employeeName: data.employees?.nama_lengkap || 'Karyawan',
                                certName: data.certificate_types?.name || 'Sertifikat K3',
                                certNumber: data.certificate_number || '-',
                                adminName: adminName,
                                status: 'APPROVED',
                                expiryDate: data.is_lifetime ? 'Seumur Hidup' : (data.expired_date || '-')
                            });
                        }
                    }
                } catch (eErr) {
                    console.error('Silent cert approval email error:', eErr.message);
                }
            })();
        }

        await invalidateCache('master:certifications_all');

        // Log Admin Audit Trail
        await logAdminActivity({
            userId: req.userId,
            action: 'Sertifikasi Disetujui',
            details: `Admin ${deptName} (${adminName}) menyetujui sertifikat ${data.certificate_types?.name || deptName} untuk karyawan ${data.employees?.nama_lengkap || 'Karyawan'}.`,
            req
        });

        res.json({ message: `Sertifikat karyawan berhasil diterima & diverifikasi oleh ${deptName}.`, certificate: formatCert(data) });
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

        if (!reason || !reason.trim()) {
            return res.status(400).json({ error: 'Alasan penolakan sertifikat wajib diisi agar karyawan mengetahui penyebabnya.' });
        }

        // Fetch existing cert first to determine category and retain metadata
        const { data: currentCert } = await supabase
            .from('employee_certificates')
            .select('notes, certificate_types(name, category)')
            .eq('id', id)
            .single();

        const typeCat = (currentCert?.certificate_types?.category || '').toLowerCase();
        const typeName = (currentCert?.certificate_types?.name || '').toLowerCase();
        const rawNotes = (currentCert?.notes || '').toLowerCase();
        const isGeneral = typeCat.includes('general') || typeCat.includes('umum') || 
                          typeName.includes('general') || typeName.includes('umum') ||
                          rawNotes.includes('[category:general]');
        const deptName = isGeneral ? 'HRGA' : 'HSE';

        // Resolve Admin Name
        let adminName = `${deptName} Officer Admin`;
        if (req.userId) {
            const { data: adminEmp } = await supabase.from('employees').select('nama_lengkap').eq('user_id', req.userId).maybeSingle();
            if (adminEmp && adminEmp.nama_lengkap) {
                adminName = adminEmp.nama_lengkap;
            } else {
                const { data: adminUser } = await supabase.from('users').select('username').eq('id', req.userId).maybeSingle();
                if (adminUser?.username) adminName = adminUser.username;
            }
        }

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

            // Send rejection email to employee with reason
            (async () => {
                try {
                    let empEmail = await mailer.resolveUserPersonalEmail(supabase, { userId, employeeId: data.employees?.id, userObj: data.employees });
                    if (!empEmail) {
                        empEmail = data.employees?.email || data.employees?.email_office || null;
                    }
                    if (!empEmail) {
                        const { data: uData } = await supabase.from('users').select('email, recovery_email').eq('id', userId).maybeSingle();
                        empEmail = uData?.recovery_email || uData?.email;
                    }
                    if (empEmail) {
                        await mailer.sendCertRejectionEmail({
                            toEmail: empEmail,
                            employeeName: data.employees?.nama_lengkap || 'Karyawan',
                            certName: data.certificate_types?.name || (isGeneral ? 'Sertifikat Umum' : 'Sertifikat K3'),
                            certNumber: data.certificate_number || '-',
                            adminName: adminName,
                            certCategory: isGeneral ? 'General' : 'K3',
                            reason: reason || (isGeneral ? 'Dokumen belum memenuhi kelayakan verifikasi HRGA.' : 'Dokumen belum memenuhi standar verifikasi legalitas K3.')
                        });
                    }

                    // Send rejection report to responsible Admins
                    if (isGeneral) {
                        const hrgaEmails = await mailer.getHrgaAdminEmails(supabase);
                        if (hrgaEmails && hrgaEmails.length > 0) {
                            await mailer.sendHrgaCertStatusNotificationEmail({
                                toEmails: hrgaEmails,
                                employeeName: data.employees?.nama_lengkap || 'Karyawan',
                                certName: data.certificate_types?.name || 'Sertifikat Umum',
                                certNumber: data.certificate_number || '-',
                                adminName: adminName,
                                status: 'REJECTED',
                                reason: reason || 'Dokumen belum memenuhi kelayakan verifikasi HRGA.'
                            });
                        }
                    } else {
                        const hseEmails = await mailer.getHseAdminEmails(supabase);
                        if (hseEmails && hseEmails.length > 0) {
                            await mailer.sendHseCertStatusNotificationEmail({
                                toEmails: hseEmails,
                                employeeName: data.employees?.nama_lengkap || 'Karyawan',
                                certName: data.certificate_types?.name || 'Sertifikat K3',
                                certNumber: data.certificate_number || '-',
                                adminName: adminName,
                                status: 'REJECTED',
                                reason: reason || 'Dokumen belum memenuhi standar verifikasi legalitas K3.'
                            });
                        }
                    }
                } catch (eErr) {
                    console.error('Silent cert rejection email error:', eErr.message);
                }
            })();
        }

        await invalidateCache('master:certifications_all');

        // Log Admin Audit Trail
        await logAdminActivity({
            userId: req.userId,
            action: 'Sertifikasi Ditolak',
            details: `Admin ${deptName} (${adminName}) menolak sertifikat ${data.certificate_types?.name || deptName} untuk karyawan ${data.employees?.nama_lengkap || 'Karyawan'}.${reason ? ' Alasan: ' + reason : ''}`,
            status: 'Warning',
            req
        });

        res.json({ message: `Permohonan sertifikat telah ditolak oleh Admin ${deptName}.`, certificate: formatCert(data) });
    } catch (err) {
        console.error('Reject certificate error:', err);
        res.status(500).json({ error: err.message });
    }
};

