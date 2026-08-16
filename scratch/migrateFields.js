const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'BackEnd/.env') });

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hris_db').then(async () => {
    const db = mongoose.connection.db;

    const collections = ['employeedetails', 'employmentrecords', 'employeedocuments'];
    for (const col of collections) {
        console.log(`Migrating ${col}...`);
        
        try {
            await db.collection(col).dropIndex('user_1');
            console.log(`  Dropped user_1 index in ${col}`);
        } catch (e) {
            console.log(`  Index user_1 not found in ${col} or already dropped`);
        }
        
        const result = await db.collection(col).updateMany(
            { user: { $exists: true } },
            { $rename: { "user": "user_id" } }
        );
        console.log(`  Modified ${result.modifiedCount} documents in ${col}`);
    }

    console.log('Migration complete.');
    mongoose.disconnect();
}).catch(err => console.error('DB Error:', err.message));
