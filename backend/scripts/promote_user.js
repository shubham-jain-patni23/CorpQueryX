// CorpQueryX/backend/scripts/promote_user.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('../config/db');

async function promoteToCEO() {
    try {
        console.log("🔌 Connecting to Database...");

        // 1. Ensure the Level 10 Role exists
        await db.query(`
            INSERT INTO roles (id, name, level) 
            VALUES (10, 'CEO', 10) 
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log("✅ Role 'CEO' (Level 10) ensured.");

        // 2. Update the user
        const email = 'shubham@corpqueryx.com'; 
        
        const res = await db.query(`
            UPDATE users 
            SET role_id = 10 
            WHERE email = $1 
            RETURNING id, email, role_id;
        `, [email]);

        if (res.rows.length > 0) {
            console.log(`🎉 SUCCESS! User ${res.rows[0].email} is now Role ID: ${res.rows[0].role_id}`);
        } else {
            console.error(`❌ User '${email}' not found. Did you register/login first?`);
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        process.exit();
    }
}

promoteToCEO();