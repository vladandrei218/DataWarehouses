## Overview

This project provides a web interface for viewing financial assets stored in a MongoDB database and includes an MCP (Model Context Protocol) server that can be connected to Claude Desktop for conversational access to the stored financial data.

## Setup

### 1. Clear Existing Database Data

Remove all existing data from the MongoDB database:

```bash
node clear.js
```

### 2. Ingest Asset Data

Populate the database with data from `assets.js`:

```bash
node ingest.js
```

The ingestion script reads the asset information from `assets.js` and inserts it into the MongoDB database.

### 3. Start the Server

Launch the application:

```bash
node server.js
```

### 4. Open the Dashboard

Navigate to:

```text
http://localhost:3000
```

The dashboard displays all available assets. Each asset has four buttons that can be used to retrieve additional information about that asset.

## MCP Server Integration

The `mcp.mjs` file implements the MCP (Model Context Protocol) server.

On my local machine, I have connected this MCP server to Claude Desktop. This allows me to interact with the financial data stored in the database using natural language. Through Claude, I can ask questions about my assets and receive answers based on the information available in the database.

## Project Structure

| File | Description |
|--------|-------------|
| `assets.js` | Source asset data used for ingestion |
| `clear.js` | Removes all data from the MongoDB database |
| `ingest.js` | Inserts asset data from `assets.js` into MongoDB |
| `server.js` | Starts the web application |
| `mcp.mjs` | MCP server for Claude Desktop integration |

## Typical Workflow

```bash
# Clear existing data
node clear.js

# Load fresh asset data
node ingest.js

# Start the server
node server.js
```

Then open:

```text
http://localhost:3000
```

to view and interact with the asset dashboard.
