// server.js
const express = require('express');
const path = require('path');
const dal = require('./dal'); // Import our new Data Access Layer

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function startServer() {
    try {
        await dal.connectDB();

        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // [Q1] + Pagination
        app.get('/api/assets', async (req, res) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 50;
                const assets = await dal.getActiveAssets(page, limit);
                res.json({ page, limit, count: assets.length, data: assets });
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch assets" });
            }
        });

        // [Q2]
        app.get('/api/assets/:id', async (req, res) => {
            try {
                const assetDetails = await dal.getAssetById(req.params.id.toUpperCase());
                if (!assetDetails) return res.status(404).json({ error: "Asset not found" });
                res.json(assetDetails);
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch asset details" });
            }
        });

        // [Q3] + Pagination
        app.get('/api/sources', async (req, res) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 50;
                const sources = await dal.getSources(page, limit);
                res.json({ page, limit, count: sources.length, data: sources });
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch sources" });
            }
        });

        // [Q4]
        app.get('/api/sources/:sourceId', async (req, res) => {
            try {
                const source = await dal.getSourceById(req.params.sourceId.toLowerCase());
                if (!source) return res.status(404).json({ error: "Source not found" });
                res.json(source);
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch source details" });
            }
        });

        // [Q5]
        app.get('/api/timeseries/:sourceId/:assetId', async (req, res) => {
            try {
                const assetId = req.params.assetId.toUpperCase();
                const instrumentCheck = await dal.getAssetById(assetId);
                
                if (!instrumentCheck) return res.status(404).json({ error: "Asset not found" });
                
                const seriesData = await dal.getTimeSeries(assetId);
                res.json({ instrumentId: assetId, dataPointsCount: seriesData.length, series: seriesData });
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch time series" });
            }
        });

        // Temporal Update
        app.put('/api/assets/:id', async (req, res) => {
            try {
                const newRecord = await dal.historicallyUpdateAsset(req.params.id.toUpperCase(), req.body);
                res.json({ message: "Asset historically updated", updatedRecord: newRecord });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });

        // Temporal Deletion
        app.delete('/api/assets/:id', async (req, res) => {
            try {
                const deletedAt = await dal.historicallyDeleteAsset(req.params.id.toUpperCase());
                res.json({ message: "Asset historically deleted", deletedAt });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });

        // History
        app.get('/api/history/:id', async (req, res) => {
            try {
                const history = await dal.getAssetHistory(req.params.id.toUpperCase());
                if (history.length === 0) return res.status(404).json({ error: "No history found" });
                res.json({ totalVersions: history.length, timeline: history });
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch history" });
            }
        });

        // Analytics - Summary
        app.get('/api/analytics/summary/:assetId', async (req, res) => {
            try {
                const result = await dal.getAnalyticsStats(req.params.assetId.toUpperCase());
                if (result.length === 0) return res.status(404).json({ error: "No data found" });

                const summary = result[0];
                const mean = summary.avgPrice;
                const variance = summary.priceHistory.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / summary.priceHistory.length;
                const stdDev = Math.sqrt(variance);

                let riskProfile = "Low";
                const volatility = (stdDev / mean) * 100;
                if (volatility > 5) riskProfile = "High";
                else if (volatility > 1.5) riskProfile = "Moderate";

                res.json({ metrics: summary, riskProfile, volatility: volatility.toFixed(2) + "%" });
            } catch (error) {
                res.status(500).json({ error: "Analytics failed" });
            }
        });

        app.listen(port, () => console.log(`Acme API running on port ${port}`));

    } catch (err) {
        console.error('Failed to start server:', err);
    }
}

startServer();