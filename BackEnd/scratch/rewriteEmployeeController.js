const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'controllers', 'employeeController.js');

const newContent = `const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const EmployeeDetail = require('../models/EmployeeDetail');
const EmploymentRecord = require('../models/EmploymentRecord');
const EmployeeDocument = require('../models/EmployeeDocument');

// Helper to flatten populated user document
const flattenUser = (user) => {
    const u = user.toObject();
    const result = {
        ...u,
        id: u._id.toString()
    };
    
    if (u.employeeDetail) {
        Object.assign(result, u.employeeDetail);
        delete result.employeeDetail;
    }
    if (u.employmentRecord) {
        Object.assign(result, u.employmentRecord);
        delete result.employmentRecord;
    }
    if (u.employeeDocument) {
        Object.assign(result, u.employeeDocument);
        delete result.employeeDocument;
    }
    return result;
};

exports.get_employees = async (req, res) => {
    try {
        const users = await User.find()
            .populate('employeeDetail')
            .populate('employmentRecord')
            .populate('employeeDocument')
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
        const users = await User.find({ department: { $ne: null } }).select('nama role department');
        
        const deptMap = {};
        users.forEach(user => {
            const div = user.department || 'Unassigned';
            if (!deptMap[div]) {
                deptMap[div] = { name: div, head: '-', employees: 0, status: 'Active' };
            }
            deptMap[div].employees += 1;
            
            if (user.role === 'admin' || user.role === 'pjo' || user.role === 'hr') {
                if (deptMap[div].head === '-') deptMap[div].head = user.nama || user.full_name;
            }
        });

        const departments = Object.keys(deptMap).map((key, idx) => ({
            id: String(idx + 1),
            ...deptMap[key]
        }));

        res.json(departments);
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

exports.post_employees = async (req, res) => {
    try {
        const payload = req.body;
        
        // Handle file uploads directly into payload
        if (req.files) {
            if (req.files.ktp_file && req.files.ktp_file[0]) payload.ktp = \`/uploads/documents/\${req.files.ktp_file[0].filename}\`;
            if (req.files.kk_file && req.files.kk_file[0]) payload.kartu_keluarga = \`/uploads/documents/\${req.files.kk_file[0].filename}\`;
            if (req.files.npwp_file && req.files.npwp_file[0]) payload.kartu_npwp = \`/uploads/documents/\${req.files.npwp_file[0].filename}\`;
            if (req.files.ijazah_file && req.files.ijazah_file[0]) payload.ijazah_transkrip = \`/uploads/documents/\${req.files.ijazah_file[0].filename}\`;
        }

        const rawPassword = payload.password || 'password123';
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        const username = payload.username || (payload.email_office ? payload.email_office.split('@')[0] : \`user_\${Date.now()}\`);

        const newUser = new User({
            username,
            password: hashedPassword,
            nama: payload.nama,
            email_office: payload.email_office,
            department: payload.department,
            jabatan: payload.jabatan,
            nomor_pegawai: payload.nomor_pegawai,
            role: payload.role || 'employee'
        });
        await newUser.save();

        const detail = new EmployeeDetail({ user: newUser._id, ...payload });
        await detail.save();

        const record = new EmploymentRecord({ user: newUser._id, ...payload });
        await record.save();

        const doc = new EmployeeDocument({ user: newUser._id, ...payload });
        await doc.save();

        newUser.employeeDetail = detail._id;
        newUser.employmentRecord = record._id;
        newUser.employeeDocument = doc._id;
        await newUser.save();

        try {
            const { notifyAdmins } = require('./notificationController');
            await notifyAdmins('Data Karyawan Baru', \`Karyawan baru ditambahkan: \${payload.nama} (\${payload.role})\`, 'user', '/organization');
        } catch (e) { console.error('Failed to notify admins:', e.message); }

        const populatedUser = await User.findById(newUser._id)
            .populate('employeeDetail').populate('employmentRecord').populate('employeeDocument')
            .select('-password');

        res.status(201).json({ message: 'Employee added successfully', data: [flattenUser(populatedUser)] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.put_employees = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        if (req.files) {
            if (req.files.ktp_file && req.files.ktp_file[0]) updates.ktp = \`/uploads/documents/\${req.files.ktp_file[0].filename}\`;
            if (req.files.kk_file && req.files.kk_file[0]) updates.kartu_keluarga = \`/uploads/documents/\${req.files.kk_file[0].filename}\`;
            if (req.files.npwp_file && req.files.npwp_file[0]) updates.kartu_npwp = \`/uploads/documents/\${req.files.npwp_file[0].filename}\`;
            if (req.files.ijazah_file && req.files.ijazah_file[0]) updates.ijazah_transkrip = \`/uploads/documents/\${req.files.ijazah_file[0].filename}\`;
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (updates.password) {
            user.password = await bcrypt.hash(updates.password, 10);
        }
        
        // Update user fields
        const userFields = ['nama', 'email_office', 'department', 'jabatan', 'nomor_pegawai', 'role'];
        userFields.forEach(f => { if (updates[f] !== undefined) user[f] = updates[f]; });
        await user.save();

        // Update relations
        if (user.employeeDetail) await EmployeeDetail.findByIdAndUpdate(user.employeeDetail, updates);
        if (user.employmentRecord) await EmploymentRecord.findByIdAndUpdate(user.employmentRecord, updates);
        if (user.employeeDocument) await EmployeeDocument.findByIdAndUpdate(user.employeeDocument, updates);

        const populatedUser = await User.findById(id)
            .populate('employeeDetail').populate('employmentRecord').populate('employeeDocument')
            .select('-password');

        res.json({ message: 'Employee updated successfully', data: [flattenUser(populatedUser)] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.post_employees_bulk = async (req, res) => {
    try {
        const { employees } = req.body;
        if (!employees || !Array.isArray(employees)) return res.status(400).json({ error: 'Invalid payload' });

        let count = 0;
        for (const emp of employees) {
            if (!emp.nama) continue; 
            
            const rawPassword = emp.password || emp.nomor_pegawai || 'password123';
            const hashedPassword = await bcrypt.hash(rawPassword, 10);
            const username = emp.username || (emp.email_office ? emp.email_office.split('@')[0] : \`user_\${crypto.randomBytes(4).toString('hex')}\`);

            const newUser = new User({
                username, password: hashedPassword,
                nama: emp.nama, email_office: emp.email_office,
                department: emp.department, jabatan: emp.jabatan,
                nomor_pegawai: emp.nomor_pegawai, role: emp.role || 'employee'
            });
            await newUser.save();

            const detail = new EmployeeDetail({ user: newUser._id, ...emp }); await detail.save();
            const record = new EmploymentRecord({ user: newUser._id, ...emp }); await record.save();
            const doc = new EmployeeDocument({ user: newUser._id, ...emp }); await doc.save();

            newUser.employeeDetail = detail._id;
            newUser.employmentRecord = record._id;
            newUser.employeeDocument = doc._id;
            await newUser.save();
            
            count++;
        }

        res.status(201).json({ message: \`Employees added successfully\`, count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update_profile = async (req, res) => {
    try {
        const updates = req.body;
        const user = await User.findById(req.userId);
        if (!user) throw new Error("User not found");

        if (updates.profile_photo_url) {
            user.profile_photo_url = updates.profile_photo_url;
            await user.save();
        }
        
        if (user.employeeDetail) {
            await EmployeeDetail.findByIdAndUpdate(user.employeeDetail, {
                no_handphone: updates.no_handphone,
                alamat: updates.alamat,
                tanggal_lahir: updates.tanggal_lahir
            });
        }

        const populatedUser = await User.findById(req.userId)
            .populate('employeeDetail').populate('employmentRecord').populate('employeeDocument')
            .select('nama profile_photo_url employeeDetail');

        res.json({ message: 'Profile updated successfully', data: flattenUser(populatedUser) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
\`;

fs.writeFileSync(targetFile, newContent);
console.log('Successfully updated employeeController.js');
