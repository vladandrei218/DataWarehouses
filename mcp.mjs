import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { MongoClient } from "mongodb";

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'acme_finance';

const server = new Server(
    { name: "Acme-Finance-Data-Warehouse", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

async function startMcpServer() {
    await client.connect();
    const db = client.db(dbName);
    const instrumentsCol = db.collection('instruments');
    const timeSeriesCol = db.collection('time_series');
    
    const mlPredictionsCol = db.collection('ml_predictions'); 

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [
            {
                name: "list_active_assets",
                description: "Retrieves a list of all currently active financial assets in the data warehouse.",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "get_asset_history",
                description: "Fetches the raw time-series pricing data for a specific asset.",
                inputSchema: {
                    type: "object",
                    properties: {
                        symbol: { type: "string", description: "The ticker symbol (e.g., AAPL, TSLA, BTC-USD)" }
                    },
                    required: ["symbol"]
                }
            },
            {
                name: "get_asset_analytics",
                description: "Gets statistical analysis, risk profiles, and simple forecasts for an asset.",
                inputSchema: {
                    type: "object",
                    properties: {
                        symbol: { type: "string", description: "The ticker symbol (e.g., AAPL)" }
                    },
                    required: ["symbol"]
                }
            },
            {
                name: "compare_assets",
                description: "Compares the historical analytics and risk profiles of two different assets.",
                inputSchema: {
                    type: "object",
                    properties: {
                        symbol1: { type: "string", description: "First ticker symbol (e.g., AAPL)" },
                        symbol2: { type: "string", description: "Second ticker symbol (e.g., TSLA)" }
                    },
                    required: ["symbol1", "symbol2"]
                }
            },
            {
                name: "get_ml_predictions",
                description: "Retrieves the persisted Apache Spark Machine Learning predictions for a specific asset.",
                inputSchema: {
                    type: "object",
                    properties: {
                        symbol: { type: "string", description: "The ticker symbol (e.g., AAPL)" }
                    },
                    required: ["symbol"]
                }
            }
        ]
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        try {
            if (name === "list_active_assets") {
                const assets = await instrumentsCol.find(
                    { validTo: null, isDeleted: false },
                    { projection: { instrumentId: 1, name: 1, class: 1, _id: 0 } }
                ).toArray();
                
                return { content: [{ type: "text", text: JSON.stringify(assets, null, 2) }] };
            }

            if (name === "get_asset_history") {
                const history = await timeSeriesCol.find({ instrumentId: args.symbol.toUpperCase() })
                                                   .sort({ timestamp: 1 })
                                                   .toArray();
                return { content: [{ type: "text", text: JSON.stringify(history, null, 2) }] };
            }

            if (name === "get_asset_analytics") {
                const statsPipeline = [
                    { $match: { instrumentId: args.symbol.toUpperCase() } },
                    {
                        $group: {
                            _id: "$instrumentId",
                            minPrice: { $min: "$closePrice" },
                            maxPrice: { $max: "$closePrice" },
                            avgPrice: { $avg: "$closePrice" }
                        }
                    }
                ];
                const result = await timeSeriesCol.aggregate(statsPipeline).toArray();
                return { content: [{ type: "text", text: JSON.stringify(result[0] || "No data found", null, 2) }] };
            }

            if (name === "compare_assets") {
                const statsPipeline = (sym) => [
                    { $match: { instrumentId: sym.toUpperCase() } },
                    {
                        $group: {
                            _id: "$instrumentId",
                            minPrice: { $min: "$closePrice" },
                            maxPrice: { $max: "$closePrice" },
                            avgPrice: { $avg: "$closePrice" }
                        }
                    }
                ];
                
                const [asset1, asset2] = await Promise.all([
                    timeSeriesCol.aggregate(statsPipeline(args.symbol1)).toArray(),
                    timeSeriesCol.aggregate(statsPipeline(args.symbol2)).toArray()
                ]);
                
                const result = {
                    [args.symbol1]: asset1[0] || "No data found",
                    [args.symbol2]: asset2[0] || "No data found"
                };
                
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }

            if (name === "get_ml_predictions") {
                const predictions = await mlPredictionsCol.find({ instrumentId: args.symbol.toUpperCase() })
                                                          .limit(20)
                                                          .toArray();
                
                if (predictions.length === 0) {
                    return { content: [{ type: "text", text: `No ML predictions found for ${args.symbol}. Did you run the Spark job?` }] };
                }
                
                return { content: [{ type: "text", text: JSON.stringify(predictions, null, 2) }] };
            }

            throw new Error(`Unknown tool: ${name}`);
        } catch (error) {
            return { content: [{ type: "text", text: `Error executing tool: ${error.message}` }], isError: true };
        }
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Acme Ltd MCP Server is running!");
}

startMcpServer();