const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/User');

exports.generateMfa = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `HRIS (${user.nama || user.username})`
        });

        // Save secret temporarily (not fully enabled until verified)
        user.mfa_secret = secret.base32;
        await user.save();

        // Generate QR code
        qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) return res.status(500).json({ error: 'Error generating QR code' });
            res.json({
                secret: secret.base32,
                qrCodeUrl: data_url
            });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.verifyAndEnableMfa = async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.userId);
        
        if (!user || !user.mfa_secret) {
            return res.status(400).json({ message: 'MFA is not set up' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token: token
        });

        if (verified) {
            user.mfa_enabled = true;
            await user.save();
            res.json({ message: 'MFA enabled successfully' });
        } else {
            res.status(400).json({ message: 'Invalid verification code' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.disableMfa = async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.userId);
        
        // If MFA is enabled, require the current code to disable it (for security)
        if (user.mfa_enabled) {
            if (!token) return res.status(400).json({ message: 'Code required to disable MFA' });
            
            const verified = speakeasy.totp.verify({
                secret: user.mfa_secret,
                encoding: 'base32',
                token: token
            });

            if (!verified) {
                return res.status(400).json({ message: 'Invalid verification code' });
            }
        }

        user.mfa_enabled = false;
        user.mfa_secret = null;
        await user.save();
        res.json({ message: 'MFA disabled successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.setRecoveryEmail = async (req, res) => {
    try {
        const { email } = req.body;
        await User.findByIdAndUpdate(req.userId, { recovery_email: email });
        res.json({ message: 'Recovery email updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getDevices = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('devices');
        res.json(user.devices || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.removeDevice = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const user = await User.findById(req.userId);
        user.devices = user.devices.filter(d => d.device_id !== deviceId);
        await user.save();
        res.json({ message: 'Device removed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
