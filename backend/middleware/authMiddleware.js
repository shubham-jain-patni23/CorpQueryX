// CorpQueryX/backend/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // 1. Get the token from the header
    const token = req.header('x-auth-token');

    // 2. Check if no token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // 3. Verify the token
    try {
        const decoded = jwt.verify(token, 'secret_random_string'); // Must match the secret in auth.js
        req.user = decoded.user; // Attach the user info to the request
        next(); // Let them pass to the next step
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};