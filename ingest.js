const { MongoClient } = require('mongodb');
const YahooFinance = require('yahoo-finance2').default; 
const yahooFinance = new YahooFinance();                

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'acme_finance';


const assetsToFetch = require('./assets.js');

async function importRealData() {
    try {
        await client.connect();
        const db = client.db(dbName);
        const instrumentsCol = db.collection('instruments');
        const timeSeriesCol = db.collection('time_series');

        await timeSeriesCol.createIndex({ instrumentId: 1, timestamp: 1 }, { unique: true });
        console.log("Unique database index verified.");

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 28);

        for (const asset of assetsToFetch) {
            console.log(`Fetching data from ${asset.providerName} for ${asset.symbol}...`);

            try {
                const result = await yahooFinance.chart(asset.symbol, { period1: sevenDaysAgo });
                const quotes = result.quotes;

                if (!quotes || quotes.length === 0) {
                    console.log(`No data returned for ${asset.symbol}`);
                    continue;
                }

                const existingInstrument = await instrumentsCol.findOne({ instrumentId: asset.symbol, validTo: null });
                if (!existingInstrument) {
                    await instrumentsCol.insertOne({
                        instrumentId: asset.symbol,
                        name: asset.name,
                        class: asset.class,
                        region: asset.region,
                        provider: { name: asset.providerName, type: asset.providerType },
                        attributes: asset.attributes,
                        validFrom: new Date(),
                        validTo: null,
                        isDeleted: false
                    });
                    console.log(`Inserted Metadata for ${asset.name}`);
                }

                let upsertCount = 0;
                for (const day of quotes) {
                    if (day.open === null || day.date === null) continue;

                    const filter = { 
                        instrumentId: asset.symbol, 
                        timestamp: day.date 
                    };

                    const updateDoc = {
                        $set: {
                            instrumentId: asset.symbol,
                            timestamp: day.date,
                            openPrice: day.open,
                            closePrice: day.close,
                            highPrice: day.high,
                            lowPrice: day.low,
                            volume: day.volume
                        }
                    };

                    await timeSeriesCol.updateOne(filter, updateDoc, { upsert: true });
                    upsertCount++;
                }

                console.log(`Processed ${upsertCount} unique time series points for ${asset.symbol}`);

            } catch (apiError) {
                console.error(`Failed to process ${asset.symbol}:`, apiError.message);
            }
            console.log('\n');
        }

    } catch (error) {
        console.error("Database connection error:", error);
    } finally {
        await client.close();
        console.log("Database connection closed.");
    }
}

importRealData();