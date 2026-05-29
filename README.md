# Enterprise SAP CAP + Fiori Elements Northwind Sandbox

A professional-grade clone of the Northwind database architecture utilizing **SAP Cloud Application Programming Model (Node.js)**, **SQLite**, and **OData V2** via adapter proxy. It is pre-seeded with **50,000 corporate records** (10,000 per entity) to simulate a high-performance production database for learning and query load-testing.

## Architecture Overview

```
                      +-----------------------------+
                      |   SAP Fiori Elements UI     |
                      |   (Products & Orders Apps)  |
                      +--------------+--------------+
                                     | (OData V2)
                                     v
                      +--------------+--------------+
                      |  CAP OData V2 Adapter Proxy |
                      +--------------+--------------+
                                     | (Internal V4)
                                     v
                      +--------------+--------------+
                      |      CAP Node.js Service    |
                      |     (NorthwindService)      |
                      +--------------+--------------+
                                     |
                                     v
                      +--------------+--------------+
                      |       SQLite Database       |
                      |     (Indexed columns)       |
                      +-----------------------------+
```

### Folder Structure
- `app/`: Fiori Elements template applications and custom CSS-based Launchpad dashboard.
- `db/`: Database schema definitions (`schema.cds`) and seeded data CSVs (`db/data/`).
- `srv/`: CAP OData V2 service endpoints (`service.cds`), bootstrap logic (`server.js`), and enterprise Fiori annotations (`annotations.cds`).
- `scripts/`: Modular data generation script (`seed.js`) generating realistic business data.

---

## Quick Start Guide

### 1. Installation
Install all Node.js dependencies:
```bash
npm install
```

### 2. Auto-Seeding & Deploy
When the server starts, the database is checked. If it does not exist, the seeding script executes automatically to generate **10,000 rows** for each entity, then deploys the tables:
```bash
npx cds deploy
```
To force-regenerate the seed data CSV files:
```bash
npm run seed -- --force
```

### 3. Running Locally
Launch the application:
```bash
npm run watch
```
Open [http://localhost:4004](http://localhost:4004) in your browser. This takes you to the premium Central Launchpad, where you can navigate to the Products and Orders Fiori Elements apps.

---

## OData V2 Query Examples

The Sandbox includes indexed column settings optimized for high-volume paging, filtering, and searches:

### 1. Server-Side Paging & Row Counting
To fetch rows 20 to 30 sorted by Unit Price descending, including a total count:
```http
GET http://localhost:4004/v2/odata/v2/northwind/Products?$top=10&$skip=20&$orderby=unitPrice desc&$inlinecount=allpages
```

### 2. Deep Expansion ($expand)
Fetch the order details alongside customer details and compositional order line-items:
```http
GET http://localhost:4004/v2/odata/v2/northwind/Orders?$top=5&$expand=customer,items
```

### 3. Server-side Filtering and Searching
Filter items by category ID and stock count:
```http
GET http://localhost:4004/v2/odata/v2/northwind/Products?$filter=unitsInStock lt 50 and discontinued eq false
```

---

## CRUD API Integration (Postman / HTTP Client)

Use the endpoints below to perform write transactions on Products and Orders.

### 1. Create a Product (POST)
- **URL**: `http://localhost:4004/v2/odata/v2/northwind/Products`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "name": "Artisanal Organic Matcha",
  "unitPrice": 45.90,
  "unitsInStock": 120,
  "unitsOnOrder": 0,
  "reorderLevel": 15,
  "discontinued": false
}
```

### 2. Update a Product (PUT/MERGE)
- **URL**: `http://localhost:4004/v2/odata/v2/northwind/Products(ID=guid'YOUR-PRODUCT-UUID')`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "unitPrice": 49.99,
  "unitsInStock": 115
}
```

### 3. Delete a Product (DELETE)
- **URL**: `http://localhost:4004/v2/odata/v2/northwind/Products(ID=guid'YOUR-PRODUCT-UUID')`

---

## Performance Optimization Notes

1. **Indexes**: In `db/schema.cds`, indexes are explicitly declared on high-filter columns such as `Products.name`, `Products.unitPrice`, `Customers.companyName`, `Customers.country`, and `Orders.orderDate`.
2. **Server-Side Paging**: SAP Fiori Elements automatically appends `$top=30` and `$skip=0` to grid queries, resulting in sub-10ms response times despite a 10,000-record dataset.
3. **Transactional Drafts**: Enabled on transactional entities (`Products`, `Orders`) via `@odata.draft.enabled` to support draft-locking mechanisms for UI state persistence.


npx cds build --production
npx mbt build
cf login -a https://api.cf.ap21.hana.ondemand.com
cf deploy mta_archives/zsale-northwind_1.0.0.mtar

{
    "data": {
        "memory": 16,
        "systempassword": "Zsale2026!Hana",
        "edition": "cloud",
        "whitelistIPs": ["0.0.0.0/0"]
    }
}

cf deploy mta_archives/zsale-northwind_1.0.0.mtar
export PATH="$HOME/.local/bin:$PATH"