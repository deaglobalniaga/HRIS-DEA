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
            
            // Now test get employees
            const getReq = http.request({
                hostname: 'localhost',
                port: 5000,
                path: '/api/hris/employees',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${data.token}`
                }
            }, (getRes) => {
                let getBody = '';
                getRes.on('data', chunk => getBody += chunk);
                getRes.on('end', () => {
                    console.log('getEmployees Status:', getRes.statusCode);
                    try {
                        const parsed = JSON.parse(getBody);
                        console.log('getEmployees length:', parsed.length);
                        console.log('getEmployees sample:', parsed[0]);
                    } catch (e) {
                        console.log('❌ getEmployees Error parsing response:', getBody.substring(0, 200));
                    }
                });
            });
            getReq.end();
            
        } else {
            console.log('❌ Login FAILED:', data.message || body);
        }
    });
});
req.end(postData);
