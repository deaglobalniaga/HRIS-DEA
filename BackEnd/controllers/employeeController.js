const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const EmployeeDetail = require('../models/EmployeeDetail');
const EmploymentRecord = require('../models/EmploymentRecord');
const EmployeeDocument = require('../models/EmployeeDocument');
const Department = require('../models/Department');

const flattenUser = (user) => {
    const u = user.toObject ? user.toObject({ virtuals: true }) : user;
    const result = {
        ...u,
        id: u._id ? u._id.toString() : u.id
    };
    
    if (u.department && typeof u.department === 'object') {
        result.department_id = u.department._id;
        result.department = u.department.name;
    }
    const clean = (obj) => {
        const cleaned = { ...obj };
        delete cleaned._id; delete cleaned.id; delete cleaned.createdAt; delete cleaned.updatedAt; delete cleaned.__v; delete cleaned.user_id;
        return cleaned;
    };

    if (u.employee_detail) { Object.assign(result, clean(u.employee_detail)); delete result.employee_detail; }
    if (u.employment_record) { Object.assign(result, clean(u.employment_record)); delete result.employment_record; }
    if (u.employee_document) { Object.assign(result, clean(u.employee_document)); delete result.employee_document; }
    return result;
};

exports.get_employees = async (req, res) => {
    try {
        const users = await User.find()
            .populate('department')
            .populate('employee_detail')
            .populate('employment_record')
            .populate('employee_document')
            .select('-password')
            .sort({ nama: 1 });
            
        const data = users.map(flattenUser);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.get_departments = async (req, res) => {
    try {
        const departments = await Department.find();
        const users = await User.find({ department: { $ne: null } }).select('nama role department');
        
        const deptMap = {};
        departments.forEach(d => {
            const key = d.name.toUpperCase().trim();
            if (!deptMap[key]) {
                deptMap[key] = { 
                    id: d._id, 
                    name: d.name, 
                    description: d.description, 
                    head: '-', 
                    employees: 0, 
                    status: 'Active',
                    parent_id: d.parent_id,
                    position_x: d.position_x || 0,
                    position_y: d.position_y || 0
                };
            }
        });
        
        users.forEach(user => {
            if (!user.department) return;
            const deptObj = departments.find(d => d._id.toString() === user.department.toString());
            if (deptObj) {
                const key = deptObj.name.toUpperCase().trim();
                if (deptMap[key]) {
                    deptMap[key].employees += 1;
                    if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'pjo') {
                        if (deptMap[key].head === '-') deptMap[key].head = user.nama || user.full_name;
                    }
                }
            }
        });

        res.json(Object.values(deptMap));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.set_department_head = async (req, res) => {
    try {
        const { divisionName, newHeadId } = req.body;
        await User.updateMany({ department: divisionName, role: 'pjo' }, { $set: { role: 'employee' } });
        if (newHeadId) await User.findByIdAndUpdate(newHeadId, { role: 'pjo' });
        res.json({ success: true, message: "Kepala divisi berhasil diubah" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update_department_structure = async (req, res) => {
    try {
        const { nodes } = req.body; // Array of { id, position_x, position_y, parent_id }
        if (!nodes || !Array.isArray(nodes)) {
            return res.status(400).json({ error: "Invalid nodes array" });
        }

        const bulkOps = nodes.map(node => ({
            updateOne: {
                filter: { _id: node.id },
                update: { 
                    $set: { 
                        position_x: node.position_x, 
                        position_y: node.position_y,
                        parent_id: node.parent_id || null
                    } 
                }
            }
        }));

        if (bulkOps.length > 0) {
            await Department.bulkWrite(bulkOps);
        }

        res.json({ success: true, message: "Struktur departemen berhasil disimpan" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.post_employees = async (req, res) => {
    try {
        // Restriction check: Only superadmin or admin from HRGA can add employees
        const currentRole = (req.userRole || '').toLowerCase();
        // The token has req.user. We need to know their department.
        // We will fetch the caller's full info
        const caller = await User.findById(req.userId).populate('department');
        const callerDeptName = caller && caller.department ? caller.department.name.toUpperCase() : '';
        
        if (currentRole !== 'superadmin' && currentRole !== 'admin') {
            return res.status(403).json({ error: 'Hanya Admin atau Superadmin yang dapat menambahkan karyawan' });
        }

        const payload = req.body;
        
        if (req.files) {
            if (req.files.ktp_file && req.files.ktp_file[0]) payload.ktp_file_url = `/uploads/documents/${req.files.ktp_file[0].filename}`;
            if (req.files.kk_file && req.files.kk_file[0]) payload.kk_file_url = `/uploads/documents/${req.files.kk_file[0].filename}`;
            if (req.files.npwp_file && req.files.npwp_file[0]) payload.npwp_file_url = `/uploads/documents/${req.files.npwp_file[0].filename}`;
            if (req.files.ijazah_file && req.files.ijazah_file[0]) payload.ijazah_file_url = `/uploads/documents/${req.files.ijazah_file[0].filename}`;
        }

        if (payload.department === "") {
            payload.department = null;
        } else if (payload.department && !mongoose.Types.ObjectId.isValid(payload.department)) {
            let dynDept = await Department.findOne({ name: { $regex: new RegExp(`^${payload.department}$`, 'i') } });
            if (!dynDept) {
                dynDept = new Department({ name: payload.department, description: `Divisi ${payload.department}` });
                await dynDept.save();
            }
            payload.department = dynDept._id;
        }
        
        payload.department_id = payload.department;

        // Default password: NIK (if provided) OR nama (lowercase no space) OR 'password123'
        const rawPassword = payload.password || payload.nik || (payload.nama ? payload.nama.toLowerCase().replace(/[^a-z0-9]/g, '') : 'password123');
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        
        // Auto-generate unique username (avoid conflict)
        let baseUsername = payload.username || (payload.nama ? payload.nama.toLowerCase().replace(/[^a-z0-9]/g, '') : `user_${Date.now()}`);
        let username = baseUsername;
        let suffix = 1;
        while (await User.findOne({ username })) {
            username = `${baseUsername}${suffix}`;
            suffix++;
        }

        let newUser;
        try {
            newUser = new User({
                username,
                password: hashedPassword,
                is_first_login: true,
                nama: payload.nama,
                email_office: payload.email_office,
                department: payload.department,
                nomor_pegawai: payload.nomor_pegawai,
                role: payload.role || 'user'
            });
            await newUser.save();

            // employeedetails: personal data only
            const detailFields = ['tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'agama', 'status_perkawinan', 'alamat', 'pendidikan', 'jurusan', 'no_handphone', 'email', 'kontak_darurat', 'hubungan'];
            const detailData = { user_id: newUser._id };
            detailFields.forEach(f => { if (payload[f] !== undefined && payload[f] !== '') detailData[f] = payload[f]; });
            const detail = new EmployeeDetail(detailData);
            await detail.save();

            // employmentrecords: employment/career data
            const recordFields = ['nik', 'nomor_pkwt', 'perusahaan', 'penempatan', 'cost_center', 'jabatan', 'level', 'status_karyawan', 'join_date', 'efektif_resign', 'roster_type', 'department_id'];
            const recordData = { user_id: newUser._id };
            recordFields.forEach(f => { if (payload[f] !== undefined && payload[f] !== '') recordData[f] = payload[f]; });
            if (!recordData.roster_start_date && recordData.join_date) recordData.roster_start_date = recordData.join_date;
            if (!recordData.roster_type) recordData.roster_type = '8/2';
            const record = new EmploymentRecord(recordData);
            await record.save();

            // employeedocuments: documents and bank data
            const docFields = ['no_ktp', 'ktp_file_url', 'kartu_keluarga', 'kk_file_url', 'npwp', 'kartu_npwp', 'npwp_file_url', 'status_pajak', 'nomor_kpj', 'nomor_jkn', 'ijazah_transkrip', 'ijazah_file_url', 'nama_rekening', 'nomor_rekening', 'nama_bank'];
            const docData = { user_id: newUser._id };
            docFields.forEach(f => { if (payload[f] !== undefined && payload[f] !== '') docData[f] = payload[f]; });
            const doc = new EmployeeDocument(docData);
            await doc.save();

            try {
                const { notifyAdmins } = require('./notificationController');
                await notifyAdmins('Data Karyawan Baru', `Karyawan baru ditambahkan: ${payload.nama} (${payload.role})`, 'user', '/organization');
            } catch (e) { console.error('Failed to notify admins:', e.message); }

            const populatedUser = await User.findById(newUser._id)
                .populate('department')
                .populate('employee_detail')
                .populate('employment_record')
                .populate('employee_document')
                .select('-password');

            res.status(201).json({ 
                message: 'Karyawan berhasil ditambahkan!', 
                data: [flattenUser(populatedUser)],
                default_password: rawPassword,
                username
            });
        } catch (innerErr) {
            // Manual rollback if creation fails halfway
            if (newUser && newUser._id) {
                await User.findByIdAndDelete(newUser._id);
                await EmployeeDetail.findOneAndDelete({ user_id: newUser._id });
                await EmploymentRecord.findOneAndDelete({ user_id: newUser._id });
                await EmployeeDocument.findOneAndDelete({ user_id: newUser._id });
            }
            throw innerErr; // re-throw to be caught by outer catch
        }
    } catch (err) {
        // Cleanup uploaded files if error occurs
        if (req.files) {
            Object.values(req.files).forEach(fileArray => {
                fileArray.forEach(file => {
                    try {
                        fs.unlinkSync(file.path);
                    } catch (unlinkErr) {
                        console.error('Failed to delete uploaded file:', unlinkErr);
                    }
                });
            });
        }
        res.status(500).json({ error: err.message });
    }
};

exports.put_employees = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        console.log("PUT /employees/:id - Received updates:", updates);
        
        // Remove _id, id, and user_id from top level
        delete updates._id;
        delete updates.id;
        delete updates.user_id;

        // Recursively remove any _id or id if nested objects somehow passed through (though FormData sends strings, better safe)
        const sanitizeUpdates = (obj) => {
            for (let prop in obj) {
                if (prop === '_id' || prop === 'id' || prop === 'user_id') {
                    delete obj[prop];
                } else if (typeof obj[prop] === 'object' && obj[prop] !== null && !Array.isArray(obj[prop])) {
                    sanitizeUpdates(obj[prop]);
                }
            }
        };
        sanitizeUpdates(updates);
        
        if (req.files) {
            if (req.files.ktp_file && req.files.ktp_file[0]) updates.ktp_file_url = `/uploads/documents/${req.files.ktp_file[0].filename}`;
            if (req.files.kk_file && req.files.kk_file[0]) updates.kk_file_url = `/uploads/documents/${req.files.kk_file[0].filename}`;
            if (req.files.npwp_file && req.files.npwp_file[0]) updates.npwp_file_url = `/uploads/documents/${req.files.npwp_file[0].filename}`;
            if (req.files.ijazah_file && req.files.ijazah_file[0]) updates.ijazah_file_url = `/uploads/documents/${req.files.ijazah_file[0].filename}`;
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (updates.password) {
            user.password = await bcrypt.hash(updates.password, 10);
        }

        if (updates.department === "") {
            updates.department = null;
        } else if (updates.department && !mongoose.Types.ObjectId.isValid(updates.department)) {
            let dynDept = await Department.findOne({ name: { $regex: new RegExp(`^${updates.department}$`, 'i') } });
            if (!dynDept) {
                dynDept = new Department({ name: updates.department, description: `Divisi ${updates.department}` });
                await dynDept.save();
            }
            updates.department = dynDept._id;
        }
        
        updates.department_id = updates.department;

        if (updates.role && updates.role !== user.role && req.userRole !== 'superadmin') {
            return res.status(403).json({ error: 'Hanya Super Admin yang dapat mengubah role karyawan.' });
        }
        
        // Fields that go to users collection
        const userFields = ['nama', 'email_office', 'department', 'department_id', 'nomor_pegawai', 'role', 'attendance_camera_access', 'attendance_gps_access'];
        userFields.forEach(f => { if (updates[f] !== undefined) user[f] = updates[f]; });
        await user.save();

        // Fields for employeedetails (personal data)
        const detailFields = ['tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'agama', 'status_perkawinan', 'alamat', 'pendidikan', 'jurusan', 'no_handphone', 'email', 'kontak_darurat', 'hubungan'];
        const detailUpdate = {};
        detailFields.forEach(f => { if (updates[f] !== undefined) detailUpdate[f] = updates[f]; });
        if (Object.keys(detailUpdate).length > 0) {
            await EmployeeDetail.findOneAndUpdate({ user_id: id }, { $set: detailUpdate }, { new: true, upsert: true });
        }

        // Fields for employmentrecords (employment data)
        const recordFields = ['nik', 'nomor_pkwt', 'perusahaan', 'penempatan', 'cost_center', 'jabatan', 'level', 'status_karyawan', 'join_date', 'efektif_resign', 'roster_type', 'roster_start_date', 'department_id'];
        const recordUpdate = {};
        recordFields.forEach(f => { if (updates[f] !== undefined) recordUpdate[f] = updates[f]; });
        if (Object.keys(recordUpdate).length > 0) {
            await EmploymentRecord.findOneAndUpdate({ user_id: id }, { $set: recordUpdate }, { new: true, upsert: true });
        }

        // Fields for employeedocuments (documents and bank data)
        const docFields = ['no_ktp', 'ktp_file_url', 'kartu_keluarga', 'kk_file_url', 'npwp', 'kartu_npwp', 'npwp_file_url', 'status_pajak', 'nomor_kpj', 'nomor_jkn', 'ijazah_transkrip', 'ijazah_file_url', 'nama_rekening', 'nomor_rekening', 'nama_bank'];
        const docUpdate = {};
        docFields.forEach(f => { if (updates[f] !== undefined) docUpdate[f] = updates[f]; });
        if (Object.keys(docUpdate).length > 0) {
            await EmployeeDocument.findOneAndUpdate({ user_id: id }, { $set: docUpdate }, { new: true, upsert: true });
        }

        const populatedUser = await User.findById(id)
            .populate('department')
            .populate('employee_detail')
            .populate('employment_record')
            .populate('employee_document')
            .select('-password');

        res.json({ message: 'Employee updated successfully', data: flattenUser(populatedUser) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete_employees = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await EmployeeDetail.findOneAndDelete({ user_id: id });
        await EmploymentRecord.findOneAndDelete({ user_id: id });
        await EmployeeDocument.findOneAndDelete({ user_id: id });

        res.json({ message: 'Employee deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete_employees_bulk = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: 'IDs array is required' });
        }
        await User.deleteMany({ _id: { $in: ids } });
        await EmployeeDetail.deleteMany({ user_id: { $in: ids } });
        await EmploymentRecord.deleteMany({ user_id: { $in: ids } });
        await EmployeeDocument.deleteMany({ user_id: { $in: ids } });
        res.json({ message: 'Employees deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.post_employees_bulk = async (req, res) => {
    try {
        const employees = req.body;
        if (!Array.isArray(employees)) return res.status(400).json({ error: 'Invalid data format' });

        for (const payload of employees) {
            if (payload.department && !mongoose.Types.ObjectId.isValid(payload.department)) {
                let dynDept = await Department.findOne({ name: { $regex: new RegExp(`^${payload.department}$`, 'i') } });
                if (!dynDept) {
                    dynDept = new Department({ name: payload.department, description: `Divisi ${payload.department}` });
                    await dynDept.save();
                }
                payload.department = dynDept._id;
            }

            // Using NIK as default password
            const rawPassword = payload.nik || 'password123';
            const hashedPassword = await bcrypt.hash(String(rawPassword), 10);
            
            let baseUsername = payload.username || (payload.nama ? payload.nama.toLowerCase().replace(/[^a-z0-9]/g, '') : `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
            let username = baseUsername;
            let suffix = 1;
            while (await User.findOne({ username })) {
                username = `${baseUsername}${suffix}`;
                suffix++;
            }

            const newUser = new User({
                username,
                password: hashedPassword,
                nama: payload.nama || 'Tanpa Nama',
                email_office: payload.email_office,
                department: payload.department,
                nomor_pegawai: payload.nomor_pegawai,
                role: payload.role || 'user'
            });
            await newUser.save();

            const detail = new EmployeeDetail({ user_id: newUser._id, ...payload });
            await detail.save();

            const record = new EmploymentRecord({ user_id: newUser._id, ...payload });
            await record.save();

            const doc = new EmployeeDocument({ user_id: newUser._id, ...payload });
            await doc.save();
        }

        res.status(201).json({ message: `${employees.length} Karyawan berhasil diimpor.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update_profile = async (req, res) => {
    try {
        const id = req.userId; // Dari verifyToken middleware
        const updates = req.body;
        
        // Cek jika mencoba ubah email
        if (updates.email) {
            const existing = await User.findOne({ email: updates.email, _id: { $ne: id } });
            if (existing) return res.status(400).json({ error: 'Email sudah digunakan' });
        }
        
        // Jangan biarkan user biasa ngubah role/status lewat sini
        delete updates.role;
        delete updates.status;
        delete updates.department; // Biasanya department ga diubah sendiri

        const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
        res.json({ message: 'Profile updated successfully', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.post_employees_bulk = async (req, res) => {
    try {
        const { employees } = req.body;
        if (!employees || !Array.isArray(employees)) {
            return res.status(400).json({ message: "Data tidak valid atau kosong" });
        }

        let successCount = 0;
        let errors = [];
        const defaultPassword = await bcrypt.hash('hris123', 10);

        for (let i = 0; i < employees.length; i++) {
            const row = employees[i];
            
            // Extract keys dynamically to support both lowercase and uppercase/spaced headers from excel
            const getVal = (keys) => {
                for (const key of keys) {
                    if (row[key] !== undefined && row[key] !== null) return row[key];
                }
                return '';
            };

            const nama = getVal(['nama', 'NAMA', 'Nama']);
            const email = getVal(['email', 'EMAIL', 'Email', 'email_office', 'EMAIL OFFICE']);
            const email_pribadi = getVal(['email_pribadi', 'EMAIL PRIBADI']);
            
            if (!nama && !email) continue; // Skip empty rows
            
            try {
                const department = getVal(['department', 'DEPARTMENT', 'Department']);
                // Determine department if provided
                let deptId = null;
                if (department) {
                    let dept = await Department.findOne({ name: { $regex: new RegExp(`^${department}$`, 'i') } });
                    if (!dept) {
                        dept = new Department({ name: department, description: `Divisi ${department}` });
                        await dept.save();
                    }
                    deptId = dept._id;
                }

                const username = email ? email.split('@')[0] : nama.toLowerCase().replace(/\s+/g, '') + i;
                
                // Check if user already exists
                const existing = await User.findOne({ 
                    $or: [
                        { email_office: email },
                        { username: username }
                    ]
                });
                
                if (existing) {
                    errors.push(`Baris ${i+1}: Email atau username sudah terdaftar.`);
                    continue;
                }

                const role = getVal(['role', 'ROLE', 'Role']);
                // 1. Create User
                const newUser = new User({
                    username: username,
                    password: defaultPassword,
                    nama: nama || 'Tanpa Nama',
                    email_office: email,
                    nomor_pegawai: getVal(['nomor_pegawai', 'NOMOR PEGAWAI']),
                    role: role ? role.toLowerCase() : 'user',
                    department: deptId,
                    department_id: deptId,
                    is_first_login: true,
                    is_active: true
                });
                await newUser.save();

                const tglLahir = getVal(['tanggal_lahir', 'TANGGAL LAHIR']);
                const joinDate = getVal(['join_date', 'JOIN DATE', 'Join Date']);

                // 2. Create Details
                const detail = new EmployeeDetail({
                    user_id: newUser._id,
                    tempat_lahir: getVal(['tempat_lahir', 'TEMPAT LAHIR']),
                    tanggal_lahir: tglLahir ? new Date(tglLahir) : null,
                    jenis_kelamin: getVal(['jenis_kelamin', 'JENIS KELAMIN']) === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
                    agama: getVal(['agama', 'AGAMA']),
                    status_perkawinan: getVal(['status_perkawinan', 'STATUS PERKAWINAN']) || 'Belum Menikah',
                    alamat: getVal(['alamat', 'ALAMAT']),
                    pendidikan_terakhir: getVal(['pendidikan_terakhir', 'PENDIDIKAN']),
                    jurusan: getVal(['jurusan', 'JURUSAN']),
                    no_handphone: getVal(['no_handphone', 'NO HANDPHONE']),
                    email_pribadi: email_pribadi,
                    kontak_darurat_nama: getVal(['kontak_darurat_nama', 'KONTAK DARURAT']),
                    kontak_darurat_no: getVal(['kontak_darurat_no', 'KONTAK DARURAT NO', 'HUBUNGAN']) // Simplified mapping
                });
                await detail.save();

                const efResign = getVal(['efektif_resign', 'EFEKTIF RESIGN', 'Efektif Resign']);
                
                // 3. Create Employment Record
                const record = new EmploymentRecord({
                    user_id: newUser._id,
                    department_id: deptId,
                    nik: getVal(['nik', 'NIK']),
                    nomor_pkwt: getVal(['nomor_pkwt', 'NOMOR PKWT']),
                    perusahaan: getVal(['perusahaan', 'PERUSAHAAN']),
                    penempatan: getVal(['penempatan', 'PENEMPATAN']),
                    cost_center: getVal(['cost_center', 'COST CENTER']),
                    jabatan: getVal(['jabatan', 'JABATAN']),
                    level: getVal(['level', 'LEVEL']),
                    status_karyawan: getVal(['status_karyawan', 'STATUS KARYAWAN']) || 'Tetap',
                    join_date: joinDate ? new Date(joinDate) : null,
                    efektif_resign: efResign ? new Date(efResign) : null
                });
                await record.save();

                // 4. Create Document placeholders
                const doc = new EmployeeDocument({
                    user_id: newUser._id,
                    status_pajak: getVal(['status_pajak', 'STATUS PAJAK']),
                    nomor_kpj: getVal(['nomor_kpj', 'NOMOR KPJ', 'Nomor KPJ']),
                    nomor_jkn: getVal(['nomor_jkn', 'NOMOR JKN', 'Nomor JKN']),
                    nama_rekening: getVal(['nama_rekening', 'NAMA REKENING']),
                    nomor_rekening: getVal(['nomor_rekening', 'NOMOR REKENING'])
                });
                await doc.save();

                successCount++;
            } catch (err) {
                errors.push(`Baris ${i+1}: ${err.message}`);
            }
        }

        res.status(201).json({ 
            message: `Berhasil mengimport ${successCount} karyawan.`,
            successCount,
            errors
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

