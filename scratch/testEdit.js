const http = require('http');

async function testEditEmployee() {
    console.log('Testing GET employees first...');
    
    // 1. Get employees list
    http.get('http://localhost:5000/api/hris/employees', (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', async () => {
            try {
                const employees = JSON.parse(body);
                if (!employees || employees.length === 0) {
                    console.log('No employees found to edit.');
                    return;
                }
                const emp = employees[0];
                console.log('Found employee ID:', emp.id || emp._id);

                // 2. Try PUT update
                const postData = JSON.stringify({
                    nama: emp.nama + ' (Updated)',
                    department: 'HRGA'
                });

                const req = http.request({
                    hostname: 'localhost',
                    port: 5000,
                    path: `/api/hris/employees/${emp.id || emp._id}`,
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                }, (putRes) => {
                    let putBody = '';
                    putRes.on('data', chunk => putBody += chunk);
                    putRes.on('end', () => {
                        console.log('PUT Status Code:', putRes.statusCode);
                        console.log('PUT Response:', putBody);
                    });
                });

                req.on('error', e => console.error('PUT Error:', e));
                req.write(postData);
                req.end();

            } catch (err) {
                console.error('JSON Parse Error:', err.message);
            }
        });
    });
}

testEditEmployee();
