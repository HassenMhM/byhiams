const express = require('express');
const pool = require('./db');
const app = express();
const cors = require('cors');
app.use(cors());

app.use(cors({
  origin: [
    'http://127.0.0.1:5500',       // local dev
    'https://byhiams-kz0tlg77a-hassens-projects-97079607.vercel.app'   // production
  ]
}));

app.use(express.json());

app.post('/add-client', async (req, res) => {
  const { name, email, phone, wilaya, address, delivery } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO client (name, email, phone, wilaya, address, delivery) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, email, phone, wilaya, address, delivery]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});
app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
