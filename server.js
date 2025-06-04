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
// Middleware to track visits only to the client page
app.use(async (req, res, next) => {
    // Only track visits to the root path (client page)
    if (req.path === '/' && req.method === 'GET') {
        try {
            const ip = req.ip || req.connection.remoteAddress;
            await pool.query(
                'INSERT INTO site_visits (ip_address, user_agent, path) VALUES ($1, $2, $3)',
                [ip, req.headers['user-agent'], req.path]
            );
        } catch (err) {
            console.error('Visit tracking error:', err);
        }
    }
    next();
});

// Visit stats endpoint (client page only)
app.get('/visit-stats', async (req, res) => {
    try {
        // Get total visits to client page only
        const totalResult = await pool.query(
            "SELECT COUNT(*) FROM site_visits WHERE path = '/'"
        );
        const totalVisits = parseInt(totalResult.rows[0].count);
        
        // Get today's visits to client page only
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        const todayResult = await pool.query(
            "SELECT COUNT(*) FROM site_visits WHERE path = '/' AND visit_time >= $1 AND visit_time <= $2",
            [todayStart, todayEnd]
        );
        const todayVisits = parseInt(todayResult.rows[0].count);
        
        // Get daily visits for last 30 days (client page only)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const dailyResult = await pool.query(
            "SELECT DATE(visit_time) AS date, COUNT(*) " +
            "FROM site_visits " +
            "WHERE path = '/' AND visit_time >= $1 " +
            "GROUP BY date " +
            "ORDER BY date ASC",
            [thirtyDaysAgo]
        );
        
        // Fill in missing days with 0
        const dailyVisits = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            
            const found = dailyResult.rows.find(row => 
                new Date(row.date).toISOString().split('T')[0] === dateString
            );
            
            dailyVisits.push({
                date: dateString,
                count: found ? parseInt(found.count) : 0
            });
        }
        
        // Calculate average daily visits
        const totalDays = dailyVisits.length;
        const totalVisitsPeriod = dailyVisits.reduce((sum, day) => sum + day.count, 0);
        const avgDaily = Math.round(totalVisitsPeriod / totalDays);
        
        // Prepare response
        res.json({
            totalVisits,
            todayVisits,
            avgDaily,
            dailyVisits
        });
        
    } catch (error) {
        console.error('Error fetching visit stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});