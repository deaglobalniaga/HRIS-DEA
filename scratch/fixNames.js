const mongoose = require('mongoose');
const User = require('../BackEnd/models/User'); // Adjusted path from scratch folder
require('dotenv').config({ path: '../BackEnd/.env' });

async function run() {
    await mongoose.connect('mongodb://127.0.0.1:27017/hris_db');
    const users = await User.find({});
    for (const u of users) {
        console.log(`User: ${u.nama}, Role: ${u.role}, ID: ${u._id}`);
    }
    process.exit(0);
}
run();
