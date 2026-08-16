async function run() {
    try {
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nama: 'aryatony', password: '123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Login successful. Role in DB vs Token:', loginData.user?.role);

        const addRes = await fetch('http://localhost:5000/api/hris/employees', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                nama: 'Test Employee',
                department: 'IT',
                role: 'user'
            })
        });
        
        const addData = await addRes.json();
        console.log('Add Employee Status:', addRes.status, 'Response:', addData);
    } catch (err) {
        console.error('Error:', err);
    }
}
run();
