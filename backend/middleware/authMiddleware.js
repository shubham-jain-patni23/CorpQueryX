// CorpQueryX/backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // 1. Get Token from Header
    const token = req.header('x-auth-token');

    // 2. Check if no token
    if (!token) {
        console.log("❌ Auth Failed: No token found in header.");
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // 3. Verify Token
    try {
        // Log the secret being used (DO NOT SHARE THIS IN PRODUCTION)
        // console.log("🔐 Verifying with Secret:", process.env.JWT_SECRET);
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        
        console.log(`✅ Auth Success: User ID ${req.user.id} (Role: ${req.user.role_id})`);
        next();
    } catch (err) {
        console.error("❌ Auth Verification Failed:", err.message);
        res.status(401).json({ msg: 'Token is not valid', error: err.message });
    }
};