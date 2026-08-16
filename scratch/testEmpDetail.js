const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../BackEnd/.env') });

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hris_db').then(async () => {
    const EmployeeDetail = require('../BackEnd/models/EmployeeDetail');
    const details = await EmployeeDetail.find({}).limit(2);
    console.log('EmployeeDetail sample:', details);
    mongoose.disconnect();
}).catch(err => console.error('DB Error:', err.message));
