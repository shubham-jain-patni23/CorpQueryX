// CorpQueryX/backend/routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');

// Route: POST /api/admin/promote
// Only Level 10 users can access this
router.post('/promote', auth, async (req, res) => {
    try {
        // 1. Check if the requester is an Admin (Level 10)
        if (req.user.role_id < 10) {
            return res.status(403).json({ msg: 'Access Denied: You are not an Admin.' });
        }

        const { email, new_role } = req.body;

        // 2. Validate Input
        if (!email || !new_role) {
            return res.status(400).json({ msg: 'Please provide email and new_role' });
        }

        // 3. Update the User in Database
        const result = await db.query(
            'UPDATE users SET role_id = $1 WHERE email = $2 RETURNING id, name, email, role_id',
            [new_role, email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        console.log(`👑 User ${email} promoted to Level ${new_role} by Admin.`);
        res.json({ msg: 'Promotion Successful', user: result.rows[0] });

    } catch (err) {
        console.error("Admin Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;