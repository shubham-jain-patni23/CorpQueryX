// CorpQueryX/backend/scripts/initDB.js

const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' }); // Look for .env in the folder above

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const createTables = async () => {
  try {
    // 1. Create ROLES Table
    // Level 1 = Top Secret (CEO), Level 10 = Public (Intern)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        level INTEGER NOT NULL
      );
    `);
    console.log('✅ Roles Table Created');

    // 2. Create USERS Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role_id INTEGER REFERENCES roles(id)
      );
    `);
    console.log('✅ Users Table Created');

    // 3. Create DOCUMENTS Table
    // 3. Create DOCUMENTS Table (UPDATED)
    await pool.query(`
      DROP TABLE IF EXISTS documents; -- Delete the old imperfect table
      CREATE TABLE documents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT,
        file_path TEXT NOT NULL,  -- <--- NEW COLUMN
        uploaded_by INTEGER REFERENCES users(id),
        min_role_level INTEGER NOT NULL DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Documents Table Re-Created');

    // 4. Insert some Default Roles (So the DB isn't empty)
    await pool.query(`
      INSERT INTO roles (name, level)
      VALUES 
        ('Admin', 1),
        ('Manager', 5),
        ('Intern', 10)
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('✅ Default Roles Inserted');

  } catch (err) {
    console.error('❌ Error building database:', err);
  } finally {
    pool.end(); // Close connection
  }
};

createTables();