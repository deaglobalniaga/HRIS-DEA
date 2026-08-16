const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'BackEnd/.env') });

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hris_db').then(async () => {
    const User = require('./BackEnd/models/User');
    const user = await User.findOne({ username: 'aryatony' });
    if(user) {
        console.log('User found:', user.nama, user.username);
        const isValid = await bcrypt.compare('admin123', user.password);
        console.log('Is admin123 valid?', isValid);
        const isValid2 = await bcrypt.compare('admin123', user.password).catch(() => false) || ('admin123' === user.password);
        console.log('Is admin123 valid (controller logic)?', isValid2);
    } else {
        console.log('User not found');
    }
    mongoose.disconnect();
}).catch(err => console.error('DB Error:', err.message));
