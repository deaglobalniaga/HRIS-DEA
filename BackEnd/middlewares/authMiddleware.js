const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwtSecret');
const supabase = require('../config/supabase');

const verifyToken = async (req, res, next) => {
    // Read from HttpOnly Cookie or Authorization Header fallback
    let tokenString = req.cookies?.access_token;
    
    if (!tokenString) {
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            tokenString = authHeader.split(' ')[1];
        }
    }

    if (!tokenString) {
        return res.status(401).json({ message: 'Akses ditolak: Token autentikasi tidak ditemukan. Silakan login.' });
    }

    try {
        const secret = await getJwtSecret();
        jwt.verify(tokenString, secret, async (err, decoded) => {
            if (err) {
                res.clearCookie('access_token');
                return res.status(401).json({ 
                    message: err.name === 'TokenExpiredError' ? 'Token expired. Sesi Anda telah berakhir, silakan login kembali.' : 'Akses ditolak: Token tidak valid',
                    expired: err.name === 'TokenExpiredError'
                });
            }
            req.user = decoded;
            req.userId = decoded.id;
            req.userRole = (decoded.role || 'user').toLowerCase();

            try {
                await supabase.from('users').update({ updated_at: new Date() }).eq('id', decoded.id);
            } catch (updateErr) {
                // Silently handle
            }

            next();
        });
    } catch (error) {
        return res.status(500).json({ message: 'Kesalahan internal server saat verifikasi token' });
    }
};

const isAdmin = (req, res, next) => {
    const role = (req.userRole || '').toLowerCase();
    if (['admin', 'superadmin', 'super_admin', 'hrga_admin', 'hr'].includes(role)) {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak: Memerlukan hak akses Admin' });
    }
};

const isSuperAdmin = (req, res, next) => {
    const role = (req.userRole || '').toLowerCase();
    if (['superadmin', 'super_admin'].includes(role)) {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak: Memerlukan hak akses Super Admin' });
    }
};

const isHRGA = (req, res, next) => {
    const role = (req.userRole || '').toLowerCase();
    if (['admin', 'superadmin', 'super_admin', 'hrga_admin', 'hr'].includes(role)) {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak: Memerlukan hak akses Admin' });
    }
};

const isHSE = (req, res, next) => {
    const role = (req.userRole || '').toLowerCase();
    if (['admin', 'superadmin', 'super_admin', 'hse_admin', 'hrga_admin'].includes(role)) {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak: Memerlukan hak akses Admin' });
    }
};

// IDOR (BOLA) Guard: Ensures user can only access/modify their own resource unless they are Admin/Superadmin
const isSelfOrAdmin = (paramKey = 'id') => {
    return (req, res, next) => {
        const targetId = req.params[paramKey] || req.body?.user_id || req.query?.user_id;
        const role = (req.userRole || '').toLowerCase();
        const isPrivileged = ['admin', 'superadmin', 'super_admin', 'hrga_admin', 'hse_admin', 'hr'].includes(role);

        if (isPrivileged || req.userId === targetId) {
            next();
        } else {
            res.status(403).json({ message: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengakses dokumen pengguna lain (IDOR Protected)' });
        }
    };
};

module.exports = {
    verifyToken,
    isAdmin,
    isSuperAdmin,
    isHRGA,
    isHSE,
    isSelfOrAdmin
};
