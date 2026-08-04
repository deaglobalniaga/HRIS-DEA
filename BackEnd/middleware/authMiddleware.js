const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    // Expect "Bearer <token>"
    const tokenString = token.split(' ')[1];

    if (!tokenString) {
        return res.status(403).json({ message: 'Malformed token' });
    }

    jwt.verify(tokenString, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }
        req.userId = decoded.id;
        req.userRole = decoded.role;

        // Update last_activity for online status tracking
        try {
            const supabase = require('../config/supabaseClient');
            await supabase
                .from('users')
                .update({ last_activity: new Date() })
                .eq('id', decoded.id);
        } catch (updateErr) {
            // Silent fail - don't block request if activity update fails
            console.error('Failed to update last_activity:', updateErr);
        }

        next();
    });
};

const checkRole = (requiredRole) => {
    return (req, res, next) => {
        const role = (req.userRole || '').toLowerCase();
        if (role !== requiredRole.toLowerCase() && !role.includes('admin')) {
            return res.status(403).json({ message: `Access denied. Requires ${requiredRole} role.` });
        }
        next();
    };
};

const isAdmin = (req, res, next) => {
    const role = (req.userRole || '').toLowerCase();
    if (role.includes('admin') || role.includes('hr')) {
        next();
    } else {
        return res.status(403).json({ message: 'Access denied. Requires Admin/HR role.' });
    }
};

module.exports = { verifyToken, checkRole, isAdmin };
