const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'acme_finance';

let db, instrumentsCol, timeSeriesCol;

async function connectDB() {
    if (!db) {
        await client.connect();
        db = client.db(dbName);
        instrumentsCol = db.collection('instruments');
        timeSeriesCol = db.collection('time_series');
        console.log('DAL: Connected successfully to MongoDB');
    }
}

async function getActiveAssets(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    return await instrumentsCol.find(
        { validTo: null, isDeleted: false },
        { projection: { instrumentId: 1, name: 1, class: 1, _id: 0, provider: 1 } }
    ).skip(skip).limit(limit).toArray();
}

async function getAssetById(assetId) {
    return await instrumentsCol.findOne({ 
        instrumentId: assetId, 
        validTo: null,
        isDeleted: false
    });
}

async function getSources(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const providers = await instrumentsCol.distinct("provider.name", { validTo: null });
    const sources = providers.map((name) => ({
        dataSourceId: name.toLowerCase().replace(/\s+/g, '_'),
        name: name
    }));
    return sources.slice(skip, skip + limit);
}

async function getSourceById(sourceId) {
    const assetsFromSource = await instrumentsCol.find({ validTo: null }).toArray();
    const match = assetsFromSource.find(a => a.provider.name.toLowerCase().replace(/\s+/g, '_') === sourceId);
    
    if (!match) return null;

    const supportedSymbols = assetsFromSource
        .filter(a => a.provider.name === match.provider.name)
        .map(a => a.instrumentId);
        
    return {
        dataSourceId: sourceId,
        name: match.provider.name,
        type: match.provider.type,
        supportedInstruments: supportedSymbols
    };
}

async function getTimeSeries(assetId, startDate, endDate) {
    let query = { instrumentId: assetId };
    
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    return await timeSeriesCol.find(query).sort({ timestamp: 1 }).toArray();
}

async function historicallyUpdateAsset(assetId, updates) {
    const now = new Date();
    const currentActive = await getAssetById(assetId);

    if (!currentActive) throw new Error("Asset not found or inactive.");

    await instrumentsCol.updateOne(
        { _id: currentActive._id },
        { $set: { validTo: now } }
    );

    const newRecord = {
        instrumentId: currentActive.instrumentId,
        name: updates.name || currentActive.name,
        class: updates.class || currentActive.class,
        region: updates.region || currentActive.region,
        provider: currentActive.provider,
        attributes: { ...currentActive.attributes, ...(updates.attributes || {}) },
        validFrom: now,       
        validTo: null,        
        isDeleted: false  
    };
    
    await instrumentsCol.insertOne(newRecord);
    return newRecord;
}

async function historicallyDeleteAsset(assetId) {
    const now = new Date();
    const currentActive = await instrumentsCol.findOne({ instrumentId: assetId, validTo: null });

    if (!currentActive) throw new Error("Asset not found or already deleted.");
    if (currentActive.isDeleted) throw new Error("Asset is already deleted.");

    await instrumentsCol.updateOne(
        { _id: currentActive._id },
        { $set: { validTo: now } }
    );

    await instrumentsCol.insertOne({
        ...currentActive,
        _id: undefined, 
        validFrom: now,       
        validTo: null,        
        isDeleted: true  
    });
    
    return now;
}

async function getAssetHistory(assetId) {
    return await instrumentsCol.find({ instrumentId: assetId }).sort({ validFrom: 1 }).toArray();
}

async function getAnalyticsStats(assetId) {
    const statsPipeline = [
        { $match: { instrumentId: assetId } },
        {
            $group: {
                _id: "$instrumentId",
                totalDataPoints: { $sum: 1 },
                minPrice: { $min: "$closePrice" },
                maxPrice: { $max: "$closePrice" },
                avgPrice: { $avg: "$closePrice" },
                avgVolume: { $avg: "$volume" },
                priceHistory: { $push: "$closePrice" }
            }
        }
    ];
    return await timeSeriesCol.aggregate(statsPipeline).toArray();
}

module.exports = {
    connectDB, getActiveAssets, getAssetById, getSources, getSourceById, 
    getTimeSeries, historicallyUpdateAsset, historicallyDeleteAsset, 
    getAssetHistory, getAnalyticsStats
};