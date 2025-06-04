require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS'));
    }
  }
}));
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to add client
app.post('/add-client', async (req, res) => {
  const { name, email, phone, wilaya, address, delivery } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO client (name, email, phone, wilaya, address, delivery) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, email, phone, wilaya, address, delivery]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Add to server.js
const ip = require('ip');

// Visit tracking middleware
app.use(async (req, res, next) => {
    try {
        await pool.query(
            'INSERT INTO site_visits (ip_address, user_agent, path) VALUES ($1, $2, $3)',
            [req.ip || ip.address(), req.headers['user-agent'], req.path]
        );
    } catch (err) {
        console.error('Visit tracking error:', err);
    }
    next();
});

// Endpoint to get visit counts
app.get('/visit-stats', async (req, res) => {
    try {
        const totalResult = await pool.query('SELECT COUNT(*) FROM site_visits');
        const dailyResult = await pool.query(`
            SELECT DATE(visit_time) AS date, COUNT(*) 
            FROM site_visits 
            GROUP BY date
            ORDER BY date DESC
            LIMIT 30
        `);
        
        res.json({
            totalVisits: totalResult.rows[0].count,
            dailyVisits: dailyResult.rows
        });
    } catch (err) {
        console.error('Visit stats error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});
// Add to server.js
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
// Add to server.js
const basicAuth = require('basic-auth');

// Admin credentials (store in .env in production)
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password';

// Admin authentication middleware
app.use('/admin', (req, res, next) => {
    const user = basicAuth(req);
    
    if (!user || user.name !== ADMIN_USER || user.pass !== ADMIN_PASS) {
        res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
        return res.status(401).send('Authentication required');
    }
    
    next();
});