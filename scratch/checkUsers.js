const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../BackEnd/.env') });

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hris_db').then(async () => {
    const User = require('../BackEnd/models/User');
    const users = await User.find({}).select('nama username role is_first_login password').limit(10);
    console.log(`Total users in DB: ${users.length}`);
    users.forEach(u => {
        const isHashed = u.password && u.password.startsWith('$2');
        console.log(`  nama="${u.nama}" | username="${u.username}" | role="${u.role}" | hashed=${isHashed} | first_login=${u.is_first_login}`);
    });
    mongoose.disconnect();
}).catch(err => console.error('DB Error:', err.message));
