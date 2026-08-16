const mongoose = require('mongoose');

async function checkDb(dbName) {
    const uri = `mongodb://127.0.0.1:27017/${dbName}`;
    const conn = await mongoose.createConnection(uri).asPromise();
    const collections = await conn.db.listCollections().toArray();
    console.log(`\n=== Database: ${dbName} ===`);
    if (collections.length === 0) {
        console.log('No collections found.');
    }
    for (let c of collections) {
        const count = await conn.db.collection(c.name).countDocuments();
        console.log(`- ${c.name}: ${count} documents`);
    }
    await conn.close();
}

async function run() {
    try {
        await checkDb('hris');
        await checkDb('hris_db');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
