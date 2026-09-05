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
            // 5 minutes (300 seconds) clock tolerance prevents clock skew between client & server from causing false expirations
            decoded = jwt.verify(tokenString, secret, { clockTolerance: 300 });
        } catch (err) {
            // If primary token failed and a cookie exists (or vice versa), try cookie as fallback
            if (authHeader && req.cookies?.access_token && tokenString !== req.cookies.access_token) {
                try {
                    decoded = jwt.verify(req.cookies.access_token, secret, { clockTolerance: 300 });
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

const blockSuperAdmin = (req, res, next) => {
    const role = (req.userRole || req.user?.role || '').toLowerCase();
    if (['superadmin', 'super_admin', 'super admin'].includes(role) || role.includes('super')) {
        return res.status(403).json({ 
            message: 'Akses ditolak: Role Superadmin tidak memiliki wewenang untuk melihat, menambah, maupun mengedit data operasional karyawan, sertifikasi K3, atau data biometrik wajah demi privasi dan pemisahan tugas.' 
        });
    }
    next();
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
    const isSuper = ['superadmin', 'super_admin', 'super admin'].includes(role) || role.includes('super');
    if (!isSuper && (
        ['admin', 'hrga_admin', 'hr_admin', 'admin_hr', 'admin_hrga', 'hr', 'hrga'].includes(role) ||
        role.includes('hr')
    )) {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak: Memerlukan hak akses Admin HRGA (Superadmin tidak diizinkan mengelola data karyawan)' });
    }
};

const isHSE = async (req, res, next) => {
    try {
        const userId = req.userId;
        const role = (req.userRole || req.user?.role || '').toLowerCase();
        const isSuper = ['superadmin', 'super_admin', 'super admin'].includes(role) || role.includes('super');
        if (isSuper) return next();

        // 1. If role is explicitly HRGA only, reject
        const isHRGAOnly = ['hrga_admin', 'hr_admin', 'admin_hrga', 'hr', 'hrga'].includes(role) ||
            (role.includes('hr') && !role.includes('hse'));
        if (isHRGAOnly) {
            return res.status(403).json({ 
                message: 'Akses ditolak: Hanya Admin HSE yang berwenang menyetujui, menolak, atau menambahkan sertifikasi karyawan. HRGA hanya dapat membaca data sertifikasi.' 
            });
        }

        // 2. If role is explicitly HSE, allow
        if (['hse_admin', 'hse', 'hse_officer'].includes(role) || (role.includes('hse') && !role.includes('hr'))) {
            return next();
        }

        // 3. For role 'admin', disambiguate using username, department, and position
        if (userId) {
            const { data: userProfile } = await supabase
                .from('users')
                .select(`
                    username,
                    roles (name),
                    employees (
                        jabatan,
                        nama_lengkap,
                        departments (name)
                    )
                `)
                .eq('id', userId)
                .maybeSingle();

            const username = (userProfile?.username || '').toLowerCase();
            const emp = Array.isArray(userProfile?.employees) ? userProfile.employees[0] : userProfile?.employees;
            const deptName = (emp?.departments?.name || '').toLowerCase();
            const jabatan = (emp?.jabatan || '').toLowerCase();
            const namaLengkap = (emp?.nama_lengkap || '').toLowerCase();

            const isHSEUser = username === 'hse_admin' || 
                username.includes('hse') ||
                deptName.includes('hse') || deptName.includes('k3') || deptName.includes('safety') || deptName.includes('pengelola k3') ||
                jabatan.includes('hse') || jabatan.includes('k3') || jabatan.includes('safety') ||
                namaLengkap.includes('hse');

            if (isHSEUser) {
                return next();
            }
        }

        return res.status(403).json({ 
            message: 'Akses ditolak: Hanya Admin HSE yang berwenang menyetujui, menolak, atau menambahkan sertifikasi karyawan. HRGA hanya dapat membaca data sertifikasi.' 
        });
    } catch (err) {
        console.error('isHSE check error:', err);
        return res.status(500).json({ message: 'Gagal memvalidasi hak akses HSE.' });
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
            const decoded = jwt.verify(tokenString, secret, { clockTolerance: 300 });
            if (decoded) {
                req.user = decoded;
                req.userId = decoded.id;
                req.userRole = (decoded.role || 'user').toLowerCase();
            }
        } catch (e) {}
    }
    next();
};

// Dedicated Leave & Roster Guard: HSE role is strictly forbidden from recording or deleting leaves
const canManageLeaves = async (req, res, next) => {
    try {
        const userId = req.userId;
        const role = (req.userRole || req.user?.role || '').toLowerCase();

        if (['superadmin', 'super_admin', 'super admin'].includes(role) || role.includes('super')) {
            return next();
        }

        const { data: userProfile } = await supabase
            .from('users')
            .select(`
                username,
                roles (name),
                employees (
                    departments (name)
                )
            `)
            .eq('id', userId)
            .maybeSingle();

        const roleName = (userProfile?.roles?.name || role).toLowerCase();
        const username = (userProfile?.username || '').toLowerCase();
        const emp = Array.isArray(userProfile?.employees) ? userProfile.employees[0] : userProfile?.employees;
        const deptName = (emp?.departments?.name || '').toLowerCase();

        const isSuper = roleName === 'superadmin' || username === 'arya_admin';
        const isHSE = username === 'hse_admin' || deptName.includes('hse') || deptName.includes('k3') || deptName.includes('safety') || deptName.includes('pengelola k3');
        const isHR = (roleName === 'admin' && (deptName.includes('hr') || deptName.includes('hrga') || username === 'admin')) || isSuper;

        if (!isHSE && (isSuper || isHR)) {
            return next();
        }

        return res.status(403).json({ 
            message: 'Akses ditolak: Hanya HRGA dan Superadmin yang berwenang mengelola pencatatan cuti/roster. Role HSE tidak memiliki akses ini.' 
        });
    } catch (err) {
        console.error('canManageLeaves check error:', err);
        return res.status(500).json({ message: 'Gagal memvalidasi hak akses cuti.' });
    }
};

module.exports = {
    verifyToken,
    optionalAuth,
    isAdmin,
    isSuperAdmin,
    isHRGA,
    isHSE,
    blockSuperAdmin,
    isSelfOrAdmin,
    canManageLeaves
};
