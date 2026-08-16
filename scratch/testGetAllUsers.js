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
            
            // Now test getAllUsers
            const getReq = http.request({
                hostname: 'localhost',
                port: 5000,
                path: '/api/auth/all',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${data.token}`
                }
            }, (getRes) => {
                let getBody = '';
                getRes.on('data', chunk => getBody += chunk);
                getRes.on('end', () => {
                    console.log('getAllUsers Status:', getRes.statusCode);
                    try {
                        const parsed = JSON.parse(getBody);
                        console.log('getAllUsers length:', parsed.data ? parsed.data.length : 'no data');
                    } catch (e) {
                        console.log('❌ getAllUsers Error parsing response:', getBody.substring(0, 200));
                    }
                });
            });
            getReq.end();
            
            // Also test dashboard endpoint if any
            
        } else {
            console.log('❌ Login FAILED:', data.message || body);
        }
    });
});
req.end(postData);
