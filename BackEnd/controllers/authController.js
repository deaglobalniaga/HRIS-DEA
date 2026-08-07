const supabase = require('../config/supabaseClient');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mailer = require('../utils/mailer');

const ADMIN_KEY = process.env.SECRET_KEY_ADMIN;

exports.login = async (req, res) => {
    // Accommodate 'identifier', 'username', or 'email' from different frontend versions
    const identifier = req.body.identifier || req.body.username || req.body.email;
    const { password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Identifier and password are required' });
    }

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .or(`username.eq."${identifier}",email.eq."${identifier}",nik_internal.eq."${identifier}"`)
            .single();

        if (error || !user) {
            return res.status(401).json({ message: 'User not found' });
        }

        const isValid = (await bcrypt.compare(password, user.password)) || (password === user.password);

        if (!isValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '5h'
        });

        const { password: _, ...userWithoutPassword } = user;

        res.json({
            message: 'Login successful',
            token,
            user: userWithoutPassword
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.signup = async (req, res) => {
    const { username, email, password, full_name, secret_key, first_name, last_name, date_of_birth, date_of_joining, address, division, nik_internal, contract_type, job_title, nik_ktp, phone_number } = req.body;

    let role = 'user';
    if (secret_key && secret_key === ADMIN_KEY) {
        role = 'admin';
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const { data, error } = await supabase
            .from('users')
            .insert([{
                username,
                password: hashedPassword,
                email,
                full_name: full_name || `${first_name} ${last_name}`,
                role,
                division,
                nik_internal,
                first_name,
                last_name,
                date_of_birth: date_of_birth || null,
                date_of_joining: date_of_joining || null,
                address,
                contract_type,
                job_title,
                nik_ktp,
                phone_number
            }])
            .select();

        if (error) throw error;
        
        // Notify Admins
        try {
            const { notifyAdmins } = require('./notificationController');
            await notifyAdmins(
                'Pendaftaran Karyawan Baru',
                `Karyawan baru terdaftar: ${data[0].full_name} (${data[0].role})`,
                'user',
                '/organization'
            );
        } catch (e) { console.error('Failed to notify admins on signup:', e); }

        res.status(201).json({ message: 'User registered successfully', user: data[0] });
    } catch (err) {
        console.error("Signup Error:", err.message);
        res.status(500).json({ message: err.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', req.userId)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    const updates = req.body;
    delete updates.role;
    delete updates.id;
    delete updates.username;

    try {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', req.userId)
            .select();

        if (error) throw error;
        res.json({ message: 'Profile updated', user: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.changePassword = async (req, res) => {
    const { newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const { error } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', req.userId);

        if (error) throw error;
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAllUsers = async (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    try {
        let query = supabase
            .from('users')
            .select('*, last_activity', { count: 'exact' });

        if (search) {
            query = query.ilike('username', `%${search}%`);
        }

        const { data, count, error } = await query
            .range(start, end);

        if (error) throw error;

        res.json({
            data,
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
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.uploadProfilePhoto = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No photo file provided' });
    }

    try {
        const userId = req.userId;
        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${userId}_${Date.now()}.${fileExt}`;
        const filePath = `profile-photos/${fileName}`;

        const { data: userData } = await supabase
            .from('users')
            .select('profile_photo_url')
            .eq('id', userId)
            .single();

        try {
            if (userData?.profile_photo_url) {
                const oldPath = userData.profile_photo_url.split('/').pop();
                if (oldPath) {
                    await supabase.storage
                        .from('profile-photos')
                        .remove([`profile-photos/${oldPath}`]);
                }
            }
        } catch (deleteErr) {
            console.warn("Failed to delete old photo, continuing upload:", deleteErr.message);
        }

        const { error: uploadError } = await supabase.storage
            .from('profile-photos')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('profile-photos')
            .getPublicUrl(filePath);

        const photoUrl = urlData.publicUrl;

        const { error: updateError } = await supabase
            .from('users')
            .update({ profile_photo_url: photoUrl })
            .eq('id', userId);

        if (updateError) throw updateError;

        res.json({
            message: 'Profile photo uploaded successfully',
            profile_photo_url: photoUrl
        });

    } catch (err) {
        console.error('Photo upload error FULL OBJECT:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getOnlineUsers = async (req, res) => {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const { data, error } = await supabase
            .from('users')
            .select('id, username, profile_photo_url, last_activity')
            .gte('last_activity', fiveMinutesAgo.toISOString())
            .order('last_activity', { ascending: false });

        if (error) throw error;

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(404).json({ message: 'Email tidak terdaftar di sistem HRIS.' });
        }

        // Generate a 15-minute reset token
        const resetToken = jwt.sign({ id: user.id, intent: 'reset_password' }, process.env.JWT_SECRET, { expiresIn: '15m' });
        
        const frontendUrl = process.env.FRONTEND_URL || 'https://hris-dea.vercel.app';
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

        // Send Email using our existing mailer (mock/ethereal)
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Reset Password HRIS</h2>
                <p>Halo ${user.full_name},</p>
                <p>Kami menerima permintaan untuk melakukan reset password akun Anda.</p>
                <p>Silakan klik tautan di bawah ini untuk mengganti password Anda. Tautan ini hanya berlaku selama 15 menit.</p>
                <a href="${resetLink}" style="background-color: #c71e2c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Reset Password</a>
                <p style="margin-top: 20px; font-size: 12px; color: #888;">Jika Anda tidak meminta reset password, abaikan email ini.</p>
            </div>
        `;

        // We use nodemailer directly from mailer.js since sendRequestNotification is too specific
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const info = await transporter.sendMail({
            from: `"HRIS DGN" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: 'Reset Password Akun HRIS',
            html: htmlContent
        });

        if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
            console.log('Reset Password Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }

        res.json({ message: 'Link reset password telah dikirim ke email Anda!' });
    } catch (err) {
        console.error('Forgot Password Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password required' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.intent !== 'reset_password') {
            return res.status(400).json({ message: 'Invalid token intent' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const { error } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', decoded.id);

        if (error) throw error;
        res.json({ message: 'Password has been reset successfully. You can now login.' });
    } catch (err) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
};
