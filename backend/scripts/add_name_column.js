// CorpQueryX/backend/scripts/add_name_column.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('../config/db');

async function fixTable() {
    try {
        console.log("🔌 Connecting to Database...");
        
        // The SQL command to add the column
        await db.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS name VARCHAR(255);
        `);
        
        console.log("✅ SUCCESS! Column 'name' added to 'users' table.");
    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        process.exit();
    }
}

fixTable();