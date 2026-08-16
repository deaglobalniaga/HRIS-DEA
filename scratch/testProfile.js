const http = require('http');

const postData = JSON.stringify({
    nama: 'aryatony',
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
        const data = JSON.parse(body);
        if (data.token) {
            console.log('✅ Login SUCCESS! Token received.');
            
            // Now test getProfile
            const getReq = http.request({
                hostname: 'localhost',
                port: 5000,
                path: '/api/auth/profile',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${data.token}`
                }
            }, (getRes) => {
                let getBody = '';
                getRes.on('data', chunk => getBody += chunk);
                getRes.on('end', () => {
                    console.log('Profile Status:', getRes.statusCode);
                    if (getRes.statusCode === 200) {
                        console.log('✅ getProfile SUCCESS!');
                    } else {
                        console.log('❌ getProfile FAILED:', getBody);
                    }
                });
            });
            getReq.on('error', e => console.error('Error in getProfile:', e.message));
            getReq.end();
            
        } else {
            console.log('❌ Login FAILED:', data.message || body);
        }
    });
});

req.on('error', e => console.error('Error:', e.message));
req.write(postData);
req.end();
