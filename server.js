const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3000;
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'acme_finance';

async function startServer() {
    try {
        await client.connect();
        console.log('Connected successfully to MongoDB');
        
        const db = client.db(dbName);
        const assetsCollection = db.collection('assets');
        const count = await assetsCollection.countDocuments();
        if (count === 0) {
            console.log("Seeding database with initial data...");
            await assetsCollection.insertMany([
                {
                    symbol: "AAPL",
                    assetClass: "stock",
                    attributes: { companyName: "Apple Inc.", sector: "Technology" },
                    sourceId: "mock_api",
                    validFrom: new Date(),
                    validTo: null
                },
                {
                    symbol: "BTC",
                    assetClass: "crypto",
                    attributes: { blockchain: "Bitcoin", networkStatus: "Active" },
                    sourceId: "mock_api",
                    validFrom: new Date(),
                    validTo: null
                }
            ]);
            console.log("Database seeded!");
        }

        app.get('/api/assets', async (req, res) => {
            try {
                const activeAssets = await assetsCollection.find({ validTo: null }).toArray();
                res.json(activeAssets);
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch assets" });
            }
        });

        app.listen(port, () => {
            console.log(`Acme Ltd API is running on http://localhost:${port}`);
        });

    } catch (err) {
        console.error('Error connecting to database:', err);
    }
}

startServer();