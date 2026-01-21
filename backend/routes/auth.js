// CorpQueryX/backend/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Talk to the DB
const router = express.Router();

// 1. REGISTER ROUTE (Sign Up)
router.post('/register', async (req, res) => {
    const { username, email, password, role_id } = req.body;

    try {
        // Check if user already exists
        const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Encrypt the password (Hash it)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save to Database
        // Note: We default role_id to 3 (Intern) if not provided, for safety
        const newUser = await db.query(
            'INSERT INTO users (username, email, password, role_id) VALUES ($1, $2, $3, $4) RETURNING id, username, email',
            [username, email, hashedPassword, role_id || 3]
        );

        res.json({ msg: 'User registered successfully', user: newUser.rows[0] });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// 2. LOGIN ROUTE (Sign In)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (userResult.rows.length === 0) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const user = userResult.rows[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Create the "ID Card" (JWT Token)
        const payload = {
            user: {
                id: user.id,
                role_id: user.role_id // <--- CRITICAL for our RBAC security later
            }
        };

        // Sign the token (It expires in 1 hour)
        jwt.sign(payload, 'secret_random_string', { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, username: user.username, role_id: user.role_id } });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;