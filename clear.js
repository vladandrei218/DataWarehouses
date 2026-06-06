const { MongoClient } = require('mongodb');
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

async function resetDatabase() {
    try {
        await client.connect();
        const db = client.db('acme_finance');
        
        await db.collection('instruments').drop();
        await db.collection('time_series').drop();
        
        console.log("Database cleared successfully!");
    } catch (err) {
        console.log("Collections were already empty or didn't exist yet.");
    } finally {
        await client.close();
    }
}

resetDatabase();