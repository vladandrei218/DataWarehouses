# Acme Ltd - Financial Data Warehouse

## Architecture Overview
This project implements an enterprise-grade Data Warehouse for financial markets using a modern, scalable tech stack:
* **Database:** MongoDB (NoSQL) handling heterogeneous asset attributes and time-series data.
* **API Layer:** Node.js / Express providing RESTful access.
* **Data Access Layer (DAL):** Abstracted Repository Pattern (`dal.js`) separating persistence logic from HTTP routing.
* **Analytics Engine:** Apache Spark (PySpark) executing batch aggregations and MLlib Linear Regression directly against the database.
* **AI Integration:** Model Context Protocol (MCP) server enabling LLMs (like Claude) to securely query the warehouse.

## Temporal Database Semantics
The warehouse enforces strict temporal versioning:
* **No in-place updates or deletes.**
* Updates/Deletes close the active record by applying a `validTo` timestamp.
* A new record is inserted with a `validFrom` timestamp (and `isDeleted: true` for soft deletions).
* Full audit trails are accessible via the `/api/history/:id` endpoint.

## Data Ingestion
The `ingest.js` script implements an idempotent ETL pipeline. It normalizes data from multiple heterogeneous providers (Yahoo Finance APIs and CoinGecko public REST APIs) and safely upserts time-series data to avoid duplication.

## REST API Contract
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/assets?page=1&limit=50` | Retrieves paginated active assets. |
| `GET` | `/api/assets/:id` | Retrieves current active details for a specific asset. |
| `PUT` | `/api/assets/:id` | Temporally updates an asset's attributes. |
| `DELETE` | `/api/assets/:id` | Temporally deletes (soft-deletes) an asset. |
| `GET` | `/api/history/:id` | Retrieves the full version history of an asset. |
| `GET` | `/api/sources` | Retrieves paginated list of data providers. |
| `GET` | `/api/timeseries/:sourceId/:assetId` | Retrieves raw historical pricing data. |

## Running the Project
1. **Install dependencies:** `npm install`
2. **Ingest data:** `node ingest.js`
3. **Run API Server:** `node server.js`
4. **Run Unit Tests:** `npm test` (Executes Jest suite for DAL abstraction and temporal logic).
5. **Run Spark ML Analytics:** `source .venv/bin/activate` then `python spark_analytics.py`
