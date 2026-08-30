const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwtSecret');
const supabase = require('../config/supabase');

const verifyToken = async (req, res, next) => {
    // 1. Read from Authorization Header first (freshest from client localStorage), then fallback to Cookie
    let tokenString = null;
    const authHeader = (typeof req.get === 'function' ? req.get('authorization') : null) || req.headers?.authorization || req.headers?.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        tokenString = authHeader.split(' ')[1];
    }
    
    if (!tokenString && req.cookies?.access_token) {
        tokenString = req.cookies.access_token;
    }

    if (!tokenString) {
        return res.status(401).json({ message: 'Akses ditolak: Token autentikasi tidak ditemukan. Silakan login.' });
    }

    try {
        const secret = await getJwtSecret();
        let decoded = null;
        try {
            decoded = jwt.verify(tokenString, secret);
        } catch (err) {
            // If primary token failed and a cookie exists (or vice versa), try cookie as fallback
            if (authHeader && req.cookies?.access_token && tokenString !== req.cookies.access_token) {
                try {
                    decoded = jwt.verify(req.cookies.access_token, secret);
                } catch (fErr) {}
            }

            if (!decoded) {
                res.clearCookie('access_token');
                return res.status(401).json({ 
                    message: err.name === 'TokenExpiredError' ? 'Token expired. Sesi Anda telah berakhir, silakan login kembali.' : 'Akses ditolak: Token tidak valid',
                    expired: err.name === 'TokenExpiredError'
                });
            }
        }

        req.user = decoded;
        req.userId = decoded.id;
        req.userRole = (decoded.role || 'user').toLowerCase();

        try {
            await supabase.from('users').update({ updated_at: new Date() }).eq('id', decoded.id);
        } catch (updateErr) {
            // Silently handle
        }

        return next();
    } catch (error) {
        return res.status(500).json({ message: 'Kesalahan internal server saat verifikasi token' });
    }
};

const isAdmin = (req, res, next) => {
    const role = (req.userRole || req.user?.role || '').toLowerCase();
    if (
        ['admin', 'superadmin', 'super_admin', 'super admin', 'hrga_admin', 'hr_admin', 'admin_hr', 'admin_hrga', 'hr', 'hrga', 'hse_admin'].includes(role) ||
        role.includes('admin') ||
        role.includes('hr')
    ) {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak: Memerlukan hak akses Admin' });
    }
};

const isSuperAdmin = (req, res, next) => {
    const role = (req.userRole || req.user?.role || '').toLowerCase();
    if (['superadmin', 'super_admin', 'super admin'].includes(role) || role.includes('super')) {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak: Memerlukan hak akses Super Admin' });
    }
};

const isHRGA = (req, res, next) => {
    const role = (req.userRole || req.user?.role || '').toLowerCase();
    if (
        ['admin', 'superadmin', 'super_admin', 'super admin', 'hrga_admin', 'hr_admin', 'admin_hr', 'admin_hrga', 'hr', 'hrga', 'hse_admin'].includes(role) ||
        role.includes('admin') ||
        role.includes('hr')
    ) {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak: Memerlukan hak akses Admin' });
    }
};

const isHSE = (req, res, next) => {
    const role = (req.userRole || req.user?.role || '').toLowerCase();
    if (
        ['admin', 'superadmin', 'super_admin', 'super admin', 'hse_admin', 'hrga_admin', 'hr_admin', 'admin_hr', 'admin_hrga', 'hr', 'hrga'].includes(role) ||
        role.includes('admin') ||
        role.includes('hse')
    ) {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak: Memerlukan hak akses Admin' });
    }
};

// IDOR (BOLA) Guard: Ensures user can only access/modify their own resource unless they are Admin/Superadmin
const isSelfOrAdmin = (paramKey = 'id') => {
    return (req, res, next) => {
        const targetId = req.params[paramKey] || req.body?.user_id || req.query?.user_id;
        const role = (req.userRole || req.user?.role || '').toLowerCase();
        const isPrivileged = 
            ['admin', 'superadmin', 'super_admin', 'super admin', 'hrga_admin', 'hse_admin', 'hr_admin', 'admin_hr', 'admin_hrga', 'hr', 'hrga'].includes(role) ||
            role.includes('admin') ||
            role.includes('hr');

        if (isPrivileged || req.userId === targetId) {
            next();
        } else {
            res.status(403).json({ message: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengakses dokumen pengguna lain (IDOR Protected)' });
        }
    };
};

// Optional Auth Guard: Populates req.user & req.userId if a valid token is provided, without failing if unauthenticated
const optionalAuth = async (req, res, next) => {
    let tokenString = null;
    const authHeader = (typeof req.get === 'function' ? req.get('authorization') : null) || req.headers?.authorization || req.headers?.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        tokenString = authHeader.split(' ')[1];
    }
    if (!tokenString && req.cookies?.access_token) {
        tokenString = req.cookies.access_token;
    }
    if (tokenString) {
        try {
            const secret = await getJwtSecret();
            const decoded = jwt.verify(tokenString, secret);
            if (decoded) {
                req.user = decoded;
                req.userId = decoded.id;
                req.userRole = (decoded.role || 'user').toLowerCase();
            }
        } catch (e) {}
    }
    next();
};

module.exports = {
    verifyToken,
    optionalAuth,
    isAdmin,
    isSuperAdmin,
    isHRGA,
    isHSE,
    isSelfOrAdmin
};
