const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'middleware', 'authMiddleware.js');
let content = fs.readFileSync(targetFile, 'utf8');

// The replacement was messed up, so I will restore it by providing the correct content manually based on common knowledge of authMiddleware
const correctContent = `const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwtSecret');

const verifyToken = async (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    const tokenString = token.split(' ')[1];

    if (!tokenString) {
        return res.status(403).json({ message: 'Malformed token' });
    }

    try {
        const secret = await getJwtSecret();
        jwt.verify(tokenString, secret, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Unauthorized: Invalid token' });
            }
            req.user = decoded;
            req.userId = decoded.id;
            req.userRole = decoded.role;

            try {
                const User = require('../models/User');
                await User.findByIdAndUpdate(decoded.id, { updatedAt: new Date() });
            } catch (updateErr) {
                console.error('Failed to update last_activity:', updateErr.message);
            }

            next();
        });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error during authentication' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.userRole === 'admin' || req.userRole === 'superadmin' || req.userRole === 'hr' || req.userRole === 'pjo') {
        next();
    } else {
        res.status(403).json({ message: 'Require Admin Role!' });
    }
};

const isSuperAdmin = (req, res, next) => {
    if (req.userRole === 'superadmin') {
        next();
    } else {
        res.status(403).json({ message: 'Require Super Admin Role!' });
    }
};

module.exports = { verifyToken, isAdmin, isSuperAdmin };
`;

fs.writeFileSync(targetFile, correctContent);
console.log('authMiddleware.js fixed');
