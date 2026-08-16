const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'controllers', 'authController.js');
let content = fs.readFileSync(targetFile, 'utf8');

const newEndpoints = `
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
`;

content += newEndpoints;
fs.writeFileSync(targetFile, content);
console.log('authController.js updated with JWT endpoints.');
