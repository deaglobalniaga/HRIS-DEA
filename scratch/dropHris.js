const mongoose = require('mongoose');

async function dropHris() {
    try {
        const uri = `mongodb://127.0.0.1:27017/hris`;
        const conn = await mongoose.createConnection(uri).asPromise();
        await conn.db.dropDatabase();
        console.log('Database "hris" dropped successfully.');
        await conn.close();
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
dropHris();
