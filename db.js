const { Pool } = require('pg');

const PGHOST='ep-autumn-pine-a8jy56da-pooler.eastus2.azure.neon.tech'
,PGDATABASE='neondb'
,PGUSER='neondb_owner'
,PGPASSWORD='npg_HQ4KR8MCsbkI'
const pool = new Pool({
  user: PGUSER,
  host: PGHOST,
  database: PGDATABASE,
  password: PGPASSWORD,
  port: 5432, 
  ssl: {
    require: true,
  }
});

module.exports = pool;
