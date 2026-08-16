const http = require('http');

async function testSignupAndAddEmployee() {
    console.log('Testing Signup with string department...');
    const postData = JSON.stringify({
        nama: 'Test Employee HRGA',
        email_office: 'testhrma@dgn.com',
        password: 'password123',
        department: 'HRGA'
    });

    const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/signup',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            console.log('Response:', body);
        });
    });

    req.on('error', (e) => console.error('Request Error:', e));
    req.write(postData);
    req.end();
}

testSignupAndAddEmployee();

