const http = require('http');

// First, get the list of users to find a valid user
http.get('http://localhost:5000/api/hris/employees', (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        try {
            const data = JSON.parse(body);
            const users = Array.isArray(data) ? data : (data.employees || data.data || []);
            console.log('Total users found:', users.length);
            if (users.length > 0) {
                console.log('First 5 user names:');
                users.slice(0, 5).forEach((u, i) => {
                    console.log(`  ${i+1}. nama="${u.nama}" | username="${u.username}" | role="${u.role}"`);
                });
            }
        } catch(e) {
            console.log('Raw response:', body.substring(0, 500));
        }
    });
});
