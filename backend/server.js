// CorpQueryX/backend/server.js
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first'); // <--- THE MAGIC FIX
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const db = require('./config/db'); // <--- Import the database connection
const authRoutes = require('./routes/auth');
const auth = require('./middleware/authMiddleware');
const documentRoutes = require('./routes/documents');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', require('./routes/chat'));

app.get('/', (req, res) => {
  res.send('CorpQueryX Backend is Running! 🚀');
});

// --- NEW TEST ROUTE ---
// Let's check if the DB is actually working by asking it "What time is it?"
app.get('/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ message: 'Database Connected!', time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database Connection Failed' });
  }
});
// ----------------------

// Check if Roles exist
app.get('/check-roles', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM roles');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

// PROTECTED ROUTE
app.get('/api/secret', auth, (req, res) => {
    res.send(`Hello User ${req.user.id}! You have cracked the code. 🕵️‍♂️`);
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});