const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const port = 3000;

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'acme_finance';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

async function startServer() {
    try {
        await client.connect();
        console.log('Connected successfully to MongoDB Data Warehouse');
        
        const db = client.db(dbName);
        const instrumentsCol = db.collection('instruments');
        const timeSeriesCol = db.collection('time_series');

        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // [Q1] Return limited info about all active financial assets
        app.get('/api/assets', async (req, res) => {
            try {
                const activeAssets = await instrumentsCol.find(
                    { validTo: null, isDeleted: false },
                    { projection: { instrumentId: 1, name: 1, class: 1, _id: 0, provider: 1 } }
                ).toArray();
                
                res.json(activeAssets);
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch assets" });
            }
        });

        // [Q2] Return ALL the details of an asset knowing its identifier
        app.get('/api/assets/:id', async (req, res) => {
            try {
                const assetId = req.params.id.toUpperCase();
                const assetDetails = await instrumentsCol.findOne({ 
                    instrumentId: assetId, 
                    validTo: null,
                    isDeleted: false
                });

                if (!assetDetails) {
                    return res.status(404).json({ error: `Asset with ID ${assetId} not found or inactive` });
                }
                res.json(assetDetails);
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch asset details" });
            }
        });

        // [Q3] Return limited info about all data sources (providers)
        app.get('/api/sources', async (req, res) => {
            try {
                const providers = await instrumentsCol.distinct("provider.name", { validTo: null });
                const sources = providers.map((name) => ({
                    dataSourceId: name.toLowerCase().replace(/\s+/g, '_'),
                    name: name
                }));
                res.json(sources);
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch data sources" });
            }
        });

        // [Q4] Return all the details of a financial time-series data source knowing its identifier
        app.get('/api/sources/:sourceId', async (req, res) => {
            try {
                const sourceId = req.params.sourceId.toLowerCase();
                const assetsFromSource = await instrumentsCol.find({ validTo: null }).toArray();
                const match = assetsFromSource.find(a => a.provider.name.toLowerCase().replace(/\s+/g, '_') === sourceId);

                if (!match) {
                    return res.status(404).json({ error: `Data source '${sourceId}' not found` });
                }
                const supportedSymbols = assetsFromSource
                    .filter(a => a.provider.name === match.provider.name)
                    .map(a => a.instrumentId);
                res.json({
                    dataSourceId: sourceId,
                    name: match.provider.name,
                    type: match.provider.type,
                    supportedInstruments: supportedSymbols
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch data source details" });
            }
        });

        // [Q5] Return time-series data for specified asset and data source identifiers
        app.get('/api/timeseries/:sourceId/:assetId', async (req, res) => {
            try {
                const sourceId = req.params.sourceId.toLowerCase();
                const assetId = req.params.assetId.toUpperCase();
                const instrumentCheck = await instrumentsCol.findOne({
                    instrumentId: assetId,
                    validTo: null
                });
                if (!instrumentCheck) {
                    return res.status(404).json({ error: `Asset ${assetId} not found.` });
                }
                const dynamicSourceId = instrumentCheck.provider.name.toLowerCase().replace(/\s+/g, '_');
                if (dynamicSourceId !== sourceId) {
                    return res.status(400).json({ 
                        error: `Asset ${assetId} is provided by '${instrumentCheck.provider.name}', not '${sourceId}'.` 
                    });
                }
                const seriesData = await timeSeriesCol.find({ instrumentId: assetId })
                                                     .sort({ timestamp: 1 })
                                                     .toArray();
                res.json({
                    instrumentId: assetId,
                    dataSourceId: sourceId,
                    dataPointsCount: seriesData.length,
                    series: seriesData
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch time-series pricing data" });
            }
        });

        // Updating
        app.put('/api/assets/:id', async (req, res) => {
            try {
                const assetId = req.params.id.toUpperCase();
                const now = new Date();
                const updates = req.body; 
                const currentActive = await instrumentsCol.findOne({ 
                    instrumentId: assetId, 
                    validTo: null,
                    isDeleted: false
                });

                if (!currentActive) {
                    return res.status(404).json({ error: `Asset ${assetId} not found or inactive.` });
                }
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

                res.json({ 
                    message: `Asset ${assetId} historically updated successfully.`,
                    updatedRecord: newRecord
                });

            } catch (error) {
                res.status(500).json({ error: "Failed to historically update asset" });
            }
        });

        // Deletion 
        app.delete('/api/assets/:id', async (req, res) => {
            try {
                const assetId = req.params.id.toUpperCase();
                const now = new Date();
                const currentActive = await instrumentsCol.findOne({ 
                    instrumentId: assetId, 
                    validTo: null 
                });

                if (!currentActive) {
                    return res.status(404).json({ error: `Asset ${assetId} not found or already deleted.` });
                }
                if (currentActive.isDeleted === true) {
                    return res.status(400).json({ error: `Asset ${assetId} is already deleted.` });
                }
                await instrumentsCol.updateOne(
                    { _id: currentActive._id },
                    { $set: { validTo: now } }
                );
                await instrumentsCol.insertOne({
                    instrumentId: assetId,
                    name: currentActive.name,
                    class: currentActive.class,
                    region: currentActive.region,
                    provider: currentActive.provider,
                    attributes: currentActive.attributes,
                    validFrom: now,       
                    validTo: null,        
                    isDeleted: true  
                });

                res.json({ 
                    message: `Asset ${assetId} historically deleted successfully.`,
                    deletedAt: now
                });

            } catch (error) {
                res.status(500).json({ error: "Failed to historically delete asset" });
            }
        });

        // History 
        app.get('/api/history/:id', async (req, res) => {
            try {
                const assetId = req.params.id.toUpperCase();
                const history = await instrumentsCol.find({ instrumentId: assetId })
                                                    .sort({ validFrom: 1 })
                                                    .toArray();

                if (history.length === 0) {
                    return res.status(404).json({ error: `No history found for asset ${assetId}` });
                }
                res.json({
                    instrumentId: assetId,
                    totalVersions: history.length,
                    timeline: history
                });
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch asset history" });
            }
        });

        // UC 3
        app.get('/api/analytics/summary/:assetId', async (req, res) => {
            try {
                const assetId = req.params.assetId.toUpperCase();
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

                const result = await timeSeriesCol.aggregate(statsPipeline).toArray();

                if (result.length === 0) {
                    return res.status(404).json({ error: `No historical analytical data found for asset: ${assetId}` });
                }

                const summary = result[0];
                const prices = summary.priceHistory;
                const mean = summary.avgPrice;
                const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
                const standardDeviation = Math.sqrt(variance);

                let riskProfile = "Low";
                const volatilityPercentage = (standardDeviation / mean) * 100;
                if (volatilityPercentage > 5) riskProfile = "High";
                else if (volatilityPercentage > 1.5) riskProfile = "Moderate";

                res.json({
                    instrumentId: summary._id,
                    metrics: {
                        recordCount: summary.totalDataPoints,
                        minimumClosePrice: summary.minPrice,
                        maximumClosePrice: summary.maxPrice,
                        averageClosePrice: parseFloat(summary.avgPrice.toFixed(4)),
                        averageDailyVolume: Math.round(summary.avgVolume)
                    },
                    riskSignals: {
                        historicalVolatility: parseFloat(standardDeviation.toFixed(4)),
                        volatilityPercentage: parseFloat(volatilityPercentage.toFixed(2)) + "%",
                        riskProfile: riskProfile
                    }
                });

            } catch (error) {
                res.status(500).json({ error: "Failed to process analytical aggregation pipeline" });
            }
        });

        app.get('/api/analytics/forecast/:assetId', async (req, res) => {
            try {
                const assetId = req.params.assetId.toUpperCase();
                const seriesData = await timeSeriesCol.find({ instrumentId: assetId }).sort({ timestamp: 1 }).toArray();

                if (seriesData.length < 2) {
                    return res.status(400).json({ error: "Insufficient data points to generate trend projections." });
                }
                const n = seriesData.length;
                let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

                seriesData.forEach((point, index) => {
                    const x = index + 1;
                    const y = point.closePrice;
                    sumX += x;
                    sumY += y;
                    sumXY += (x * y);
                    sumXX += (x * x);
                });

                const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
                const intercept = (sumY - slope * sumX) / n;
                const nextDayIndex = n + 1;
                const predictedPrice = (slope * nextDayIndex) + intercept;

                const trendDirection = slope > 0 ? "Bullish (Upward)" : slope < 0 ? "Bearish (Downward)" : "Flat";

                res.json({
                    instrumentId: assetId,
                    algorithmUsed: "Ordinary Least Squares (OLS) Linear Regression",
                    historicalBasisPoints: n,
                    trendDirection: trendDirection,
                    mathematicalModel: `y = (${slope.toFixed(4)} * x) + ${intercept.toFixed(4)}`,
                    currentLastPrice: seriesData[n - 1].closePrice,
                    predictedNextClosePrice: parseFloat(predictedPrice.toFixed(4))
                });

            } catch (error) {
                res.status(500).json({ error: "Failed to generate algorithmic forecast" });
            }
        });

        app.listen(port, () => {
            console.log(`Acme Ltd Data Warehouse API running at http://localhost:${port}`);
            console.log(`Main User Dashboard: http://localhost:${port}`);
        });

    } catch (err) {
        console.error('Database connection error:', err);
    }
}

startServer();