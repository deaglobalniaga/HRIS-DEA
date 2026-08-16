const http = require('http');

// Test dengan nama field (sesuai frontend yang kirim field "nama")
const postData = JSON.stringify({
    nama: 'aryatony',      // bisa nama atau username
    password: 'admin123'
});

const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const data = JSON.parse(body);
            if (data.token) {
                console.log('✅ LOGIN BERHASIL!');
                console.log('   Token:', data.token.substring(0, 30) + '...');
                console.log('   Nama:', data.user?.nama);
                console.log('   Role:', data.user?.role);
                console.log('   is_first_login:', data.user?.is_first_login);
                console.log('   requirePasswordChange:', data.requirePasswordChange);
            } else {
                console.log('❌ Login Gagal:', data.message || data.error);
            }
        } catch(e) {
            console.log('Raw response:', body.substring(0, 500));
        }
    });
});

req.on('error', e => console.error('Error:', e.message));
req.write(postData);
req.end();
