// const { Pool } = require('pg');
// const PGHOST='ep-autumn-pine-a8jy56da-pooler.eastus2.azure.neon.tech'
// ,PGDATABASE='neondb'
// ,PGUSER='neondb_owner'
// ,PGPASSWORD='npg_HQ4KR8MCsbkI'
// db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;
