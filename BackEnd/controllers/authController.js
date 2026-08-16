const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');


const ADMIN_KEY = process.env.SECRET_KEY_ADMIN;

// Helper to flatten populated user document
const flattenUser = (user) => {
    const u = user.toObject ? user.toObject({ virtuals: true }) : user;
    const result = { ...u, id: u._id ? u._id.toString() : u.id };
    const clean = (obj) => {
        const cleaned = { ...obj };
        delete cleaned._id; delete cleaned.id; delete cleaned.createdAt; delete cleaned.updatedAt; delete cleaned.__v; delete cleaned.user_id;
        return cleaned;
    };

    if (u.employee_detail) { Object.assign(result, clean(u.employee_detail)); delete result.employee_detail; }
    if (u.employment_record) { Object.assign(result, clean(u.employment_record)); delete result.employment_record; }
    if (u.department && typeof u.department === 'object' && u.department.name) {
        result.department_id = u.department._id;
        result.department = u.department.name;
    } else if (u.department) {
        result.department_id = u.department;
        delete result.department; // delete the unpopulated object to prevent frontend string-method crashes
    }
    if (u.employee_document) { Object.assign(result, clean(u.employee_document)); delete result.employee_document; }
    return result;
};


exports.login = async (req, res) => {
    // The user specifically asked to login using "Nama Lengkap". 
    // We expect `req.body.nama` but fallback to `req.body.identifier` to prevent immediate breaks if frontend isn't fully updated yet.
    const namaIdentifier = req.body.nama || req.body.identifier;
    const { password } = req.body;

    if (!namaIdentifier || !password) {
        return res.status(400).json({ message: 'Nama dan password are required' });
    }

    try {
        // Find user by nama (or fallback to username/email if they typed that instead, for resilience)
        const user = await User.findOne({
            $or: [
                { nama: { $regex: new RegExp(`^${namaIdentifier}$`, 'i') } }, // Case-insensitive exact match
                { username: namaIdentifier },
                { email: namaIdentifier },
                { email_office: namaIdentifier }
            ]
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Handle both hashed and plaintext for migration (if seeded plain text password123)
        const isValid = await bcrypt.compare(password, user.password).catch(() => false) || (password === user.password);

        if (!isValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        // Check MFA and Devices
        const deviceId = req.body.deviceId;
        const mfaToken = req.body.mfaToken;

        if (user.mfa_enabled) {
            const isKnownDevice = deviceId && user.devices && user.devices.some(d => d.device_id === deviceId);

            // Require MFA if it's a new device or if no deviceId was provided
            if (!isKnownDevice) {
                if (!mfaToken) {
                    return res.status(403).json({ requireMfa: true, message: 'MFA required for new device' });
                }

                const speakeasy = require('speakeasy');
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

        // Track Device
        if (deviceId) {
            if (!user.devices) user.devices = [];
            const existingDevice = user.devices.find(d => d.device_id === deviceId);
            if (existingDevice) {
                existingDevice.last_active = new Date();
                existingDevice.ip = req.ip;
            } else {
                const UAParser = require('ua-parser-js');
                const parser = new UAParser(req.headers['user-agent']);
                const result = parser.getResult();
                const deviceName = `${result.browser.name || 'Unknown Browser'} on ${result.os.name || 'Unknown OS'}`;

                user.devices.push({
                    device_id: deviceId,
                    browser: deviceName,
                    ip: req.ip,
                    last_active: new Date()
                });
            }
            await user.save();
        }

        const { getJwtSecret } = require('../config/jwtSecret');
        const secret = await getJwtSecret();
        const token = jwt.sign({ id: user._id, role: user.role }, secret, {
            expiresIn: '24h'
        });

        await user.populate('department');
        await user.populate('employee_detail');
        await user.populate('employment_record');
        await user.populate('employee_document');


        if (user.is_first_login) {
            return res.json({
                message: 'Login successful. Password change required.',
                token,
                user: flattenUser(user),
                requirePasswordChange: true
            });
        }

        res.json({
            message: 'Login successful',
            token,
            user: flattenUser(user)
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.signup = async (req, res) => {
    try {
        const payload = req.body;
        let role = 'user';
        if (payload.secret_key && payload.secret_key === ADMIN_KEY) {
            role = 'admin';
        }

        const Department = require('../models/Department');
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

        const hashedPassword = await bcrypt.hash(payload.password, 10);
        payload.password = hashedPassword;
        payload.role = role;
        if (!payload.username) {
            payload.username = payload.email_office ? payload.email_office.split('@')[0] : (payload.nama ? payload.nama.toLowerCase().replace(/\s+/g, '_') : `user_${Date.now()}`);
        }

        const newUser = new User(payload);
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (err) {
        console.error("Signup Error:", err.message);
        res.status(500).json({ message: err.message });
    }
};


exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .populate('department')
            .populate('employee_detail')
            .populate('employment_record')
            .populate('employee_document')
            .select('-password');
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json(flattenUser(user));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    const EmployeeDetail = require('../models/EmployeeDetail');
    const EmployeeDocument = require('../models/EmployeeDocument');

    const updates = { ...req.body };

    // Security: never allow privilege escalation or ID changes
    delete updates.role;
    delete updates._id;
    delete updates.id;
    delete updates.username;
    delete updates.password;
    delete updates.department;       // department is set only by admin — prevent ObjectId cast error
    delete updates.department_id;
    delete updates.user_id;

    // Handle file uploads for profile photo
    if (req.files) {
        if (req.files.ktp_file && req.files.ktp_file[0]) updates.ktp_file_url = `/uploads/documents/${req.files.ktp_file[0].filename}`;
        if (req.files.kk_file && req.files.kk_file[0]) updates.kk_file_url = `/uploads/documents/${req.files.kk_file[0].filename}`;
        if (req.files.npwp_file && req.files.npwp_file[0]) updates.npwp_file_url = `/uploads/documents/${req.files.npwp_file[0].filename}`;
        if (req.files.ijazah_file && req.files.ijazah_file[0]) updates.ijazah_file_url = `/uploads/documents/${req.files.ijazah_file[0].filename}`;
    }

    try {
        // Fields for users collection (self-editable)
        const userFields = ['nama', 'email_office', 'nomor_pegawai', 'foto_url', 'recovery_email', 'attendance_camera_access', 'attendance_gps_access'];
        const userUpdate = {};
        userFields.forEach(f => { if (updates[f] !== undefined) userUpdate[f] = updates[f]; });

        // Also accept legacy field names from old Settings.jsx form
        if (updates.full_name && !userUpdate.nama) userUpdate.nama = updates.full_name;
        if (updates.email && !userUpdate.email_office) userUpdate.email_office = updates.email;

        if (Object.keys(userUpdate).length > 0) {
            await User.findByIdAndUpdate(req.userId, { $set: userUpdate }, { new: true });
        }

        // Fields for employee_details (personal data — self-editable)
        const detailFields = ['tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'agama', 'status_perkawinan', 'alamat', 'pendidikan', 'jurusan', 'no_handphone', 'email', 'kontak_darurat', 'hubungan'];
        // Legacy field name mapping
        if (updates.address && !updates.alamat) updates.alamat = updates.address;
        if (updates.phone_number && !updates.no_handphone) updates.no_handphone = updates.phone_number;
        if (updates.date_of_birth && !updates.tanggal_lahir) updates.tanggal_lahir = updates.date_of_birth;

        const detailUpdate = {};
        detailFields.forEach(f => { if (updates[f] !== undefined) detailUpdate[f] = updates[f]; });
        if (Object.keys(detailUpdate).length > 0) {
            await EmployeeDetail.findOneAndUpdate({ user_id: req.userId }, { $set: detailUpdate }, { upsert: true, new: true });
        }

        // Fields for employee_documents (self-editable banking/tax info)
        const docFields = ['nama_rekening', 'nomor_rekening', 'nama_bank', 'ktp_file_url', 'kk_file_url', 'npwp_file_url', 'ijazah_file_url', 'no_ktp', 'npwp'];
        const docUpdate = {};
        docFields.forEach(f => { if (updates[f] !== undefined) docUpdate[f] = updates[f]; });
        if (Object.keys(docUpdate).length > 0) {
            await EmployeeDocument.findOneAndUpdate({ user_id: req.userId }, { $set: docUpdate }, { upsert: true, new: true });
        }

        // Re-fetch updated profile
        const updatedUser = await User.findById(req.userId)
            .populate('department')
            .populate('employee_detail')
            .populate('employment_record')
            .populate('employee_document')
            .select('-password');

        res.json({ message: 'Profil berhasil diperbarui!', user: flattenUser(updatedUser) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.changePassword = async (req, res) => {
    const { newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findByIdAndUpdate(req.userId, { password: hashedPassword });
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAllUsers = async (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    try {
        const query = search ? {
            $or: [
                { nama: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ]
        } : {};

        const users = await User.find(query)
            .populate('employee_detail')
            .populate('employment_record')
            .populate('employee_document')
            .skip(skip).limit(parseInt(limit)).select('-password');
        const count = await User.countDocuments(query);

        res.json({
            data: users.map(flattenUser),
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;

    if (id === req.userId) {
        return res.status(400).json({ message: "You cannot delete your own admin account." });
    }

    try {
        await User.findByIdAndDelete(id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getOnlineUsers = async (req, res) => {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const users = await User.find({
            updatedAt: { $gte: fiveMinutesAgo }
        }).select('username nama profile_photo_url updatedAt');

        res.json(users.map(u => ({ ...u.toObject(), id: u._id.toString() })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Simplified placeholders for photo and forgot password since supabase storage/auth is gone
exports.uploadProfilePhoto = async (req, res) => {
    res.status(501).json({ message: 'File upload needs migration to S3 or GridFS' });
};

// Setup Password (for First Login)
exports.setup_password = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const userId = req.userId; // from verifyToken middleware

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Password baru minimal 6 karakter' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.is_first_login = false;
        await user.save();

        res.json({ message: 'Password berhasil diubah. Silakan lanjutkan.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengatur password baru' });
    }
};

exports.forgot_password = async (req, res) => {
    res.status(501).json({ message: 'Not implemented in Mongo migration yet' });
};

exports.resetPassword = async (req, res) => {
    res.status(501).json({ message: 'Not implemented in Mongo migration yet' });
};

exports.getJwtSecretEndpoint = async (req, res) => {
    try {
        const { getJwtSecret } = require('../config/jwtSecret');
        const secret = await getJwtSecret();
        res.json({ secret });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.regenerateJwtSecret = async (req, res) => {
    try {
        const crypto = require('crypto');
        const { updateJwtSecret } = require('../config/jwtSecret');

        const newSecret = crypto.randomBytes(32).toString('hex');
        await updateJwtSecret(newSecret);

        res.json({ message: 'Secret Key berhasil diperbarui. Semua sesi sebelumnya otomatis terputus.', secret: newSecret });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
