const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Department = require('../models/Department');

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hris_db');
        console.log('Connected to MongoDB');

        // Create standard departments
        const depts = ['HSE', 'HRGA', 'Engineering', 'Operations', 'Finance', 'IT'];
        const deptMap = {};

        for (const d of depts) {
            let dept = await Department.findOne({ name: d });
            if (!dept) {
                dept = new Department({ name: d, description: `Divisi ${d}` });
                await dept.save();
                console.log(`Created Department: ${d}`);
            }
            deptMap[d.toLowerCase()] = dept._id;
        }

        // Migrate Users
        const users = await User.find();
        for (const user of users) {
            let changed = false;

            // 1. Role Migration
            const oldRole = user.role;
            if (oldRole === 'pjo' || oldRole === 'hr' || oldRole === 'hse') {
                user.role = 'admin';
                changed = true;
            } else if (oldRole !== 'admin' && oldRole !== 'superadmin' && oldRole !== 'user') {
                user.role = 'user';
                changed = true;
            }

            // 2. Department Migration (String -> ObjectId)
            if (user.department && typeof user.department === 'string') {
                const depStr = user.department.toLowerCase().trim();
                
                // If it matches a known dept, map it
                if (deptMap[depStr]) {
                    user.department = deptMap[depStr];
                    changed = true;
                } else {
                    // Create dynamic department if not exist
                    let dynDept = await Department.findOne({ name: { $regex: new RegExp(`^${user.department}$`, 'i') } });
                    if (!dynDept) {
                        dynDept = new Department({ name: user.department, description: `Divisi ${user.department}` });
                        await dynDept.save();
                        console.log(`Created dynamic Department: ${user.department}`);
                    }
                    deptMap[depStr] = dynDept._id;
                    user.department = dynDept._id;
                    changed = true;
                }
            } else if (!user.department) {
                user.department = null;
            }

            if (changed) {
                await user.save();
                console.log(`Migrated user: ${user.username || user.nama}`);
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

seed();
