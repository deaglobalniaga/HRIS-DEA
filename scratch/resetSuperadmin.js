const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../BackEnd/.env') });

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hris_db').then(async () => {
    const User = require('../BackEnd/models/User');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await User.findOneAndUpdate(
        { username: 'dellams' },
        { 
            $set: { 
                password: hashedPassword,
                is_first_login: false,
                role: 'admin'
            } 
        }
    );
    console.log('✅ Akun dellams juga sudah di-reset passwordnya menjadi: admin123');
    mongoose.disconnect();
}).catch(err => console.error('DB Error:', err.message));
