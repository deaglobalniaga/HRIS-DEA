const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Department = require('./models/Department');

async function clean() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hris_db');
        console.log('Connected to MongoDB');

        const depts = await Department.find();
        let deleted = 0;
        for (const dept of depts) {
            const count = await User.countDocuments({ department: dept._id });
            if (count === 0) {
                await Department.findByIdAndDelete(dept._id);
                console.log(`Deleted empty department: ${dept.name}`);
                deleted++;
            }
        }
        
        console.log(`Cleanup completed. Deleted ${deleted} departments.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

clean();
