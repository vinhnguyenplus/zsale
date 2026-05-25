const cds = require('@sap/cds');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Hook into bootstrap lifecycle
cds.on('bootstrap', (app) => {
  console.log('[Bootstrap] Initializing Northwind Clone backend...');

  // Skip SQLite-specific logic in production (HANA)
  if (cds.env.requires?.db?.kind === 'hana') {
    console.log('[Bootstrap] Running with HANA database. Skipping SQLite setup.');
    return;
  }

  const dbFile = path.join(__dirname, '../db-active.sqlite');
  const csvFile = path.join(__dirname, '../db/data/sap.cap.northwind-Products.csv');

  // Check if DB or seed files are missing
  if (!fs.existsSync(csvFile)) {
    console.log('[Bootstrap] Seed data CSV files are missing. Generating 50,000 records...');
    try {
      const runSeeding = require('../scripts/seed');
      runSeeding(true); // force generation
    } catch (err) {
      console.error('[Bootstrap] Failed to run seeding script:', err);
    }
  }

  if (!fs.existsSync(dbFile)) {
    console.log('[Bootstrap] SQLite database file db.sqlite not found. Initializing database...');
    try {
      // Execute cds deploy synchronously to create sqlite database and load CSV files
      execSync('npx cds deploy', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      console.log('[Bootstrap] Database deployed successfully.');
    } catch (err) {
      console.error('[Bootstrap] Failed to deploy database schema:', err.message);
    }
  }
});

module.exports = cds.server;
