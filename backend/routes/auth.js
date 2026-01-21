// CorpQueryX/backend/routes/auth.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// --- REGISTER ---
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // 1. Check if user exists
        const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Save User (FILLING BOTH 'username' AND 'name' TO SATISFY DB)
        const newUser = await db.query(
            'INSERT INTO users (username, name, email, password, role_id) VALUES ($1, $1, $2, $3, 1) RETURNING id, username, email, role_id',
            [name, email, hashedPassword]
        );

        // 4. Create Token (Auto-Login)
        const payload = { user: { id: newUser.rows[0].id, role_id: 1 } };
        jwt.sign(
            payload, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }, 
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: newUser.rows[0] });
            }
        );

    } catch (err) {
        console.error("Register Error:", err.message);
        res.status(500).send('Server error');
    }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Check User
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const user = result.rows[0];

        // 2. Check Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // 3. Return Token
        const payload = { user: { id: user.id, role_id: user.role_id } };
        jwt.sign(
            payload, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }, 
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.username, role_id: user.role_id } });
            }
        );

    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;