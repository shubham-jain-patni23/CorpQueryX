// CorpQueryX/backend/config/db.js

const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool (a group of connections)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for most cloud databases (Neon/Render)
    }
});

// Event listener for successful connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL Database');
});

// Export the query function so we can use it elsewhere
module.exports = {
    query: (text, params) => pool.query(text, params),
};