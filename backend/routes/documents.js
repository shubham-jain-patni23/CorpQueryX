// CorpQueryX/backend/routes/documents.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');
const { getEmbedding } = require('../utils/ai');

// Configure Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, 'uploads/'); },
    filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage });

router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        const { title, min_role_level } = req.body;
        const filePath = req.file.path;
        const userId = req.user.id;

        console.log(`📂 Processing file: ${req.file.originalname}`);

        // 1. Save to PostgreSQL
        const newDoc = await db.query(
            'INSERT INTO documents (title, file_path, uploaded_by, min_role_level) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, filePath, userId, min_role_level || 10]
        );
        const docId = newDoc.rows[0].id;

        // 2. Read File
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // 3. Get Vectors
        console.log("🧠 Generating AI Embeddings...");
        const vector = await getEmbedding(fileContent);

        // 4. Save to Qdrant using System CURL
        console.log("💾 Saving to Qdrant (via System Curl)...");
        
        // A. Create temp file in SYSTEM TEMP folder (So Nodemon ignores it)
        const payload = {
            points: [{
                id: docId,
                vector: vector,
                payload: { text: fileContent, metadata: { title: title } }
            }]
        };
        // USE /tmp/ INSTEAD OF __dirname
        const tempPayloadPath = path.join('/tmp', `temp_${Date.now()}.json`);
        fs.writeFileSync(tempPayloadPath, JSON.stringify(payload));

        // B. Construct Curl
        const qdrantUrl = process.env.QDRANT_URL.replace(/\/$/, '');
        const apiKey = process.env.QDRANT_API_KEY;
        const cmd = `curl -s -X PUT "${qdrantUrl}/collections/corp_documents/points?wait=true" -H "api-key: ${apiKey}" -H "Content-Type: application/json" -d @${tempPayloadPath}`;

        // C. Execute
        exec(cmd, (error, stdout, stderr) => {
            // Cleanup
            if (fs.existsSync(tempPayloadPath)) fs.unlinkSync(tempPayloadPath);

            if (error) {
                console.error("❌ Curl Error:", stderr || error.message);
                return res.status(500).json({ msg: 'Failed to save to Brain', error: stderr });
            }

            console.log("✅ Qdrant Response:", stdout);
            
            if (stdout.includes('"status":"ok"')) {
                console.log("✅ Document Processed Successfully!");
                res.json({ msg: 'File Uploaded & Processed by AI', document: newDoc.rows[0] });
            } else {
                res.status(500).json({ msg: 'Qdrant Error', details: stdout });
            }
        });

    } catch (err) {
        console.error("❌ Processing Error:", err);
        res.status(500).send('Server Error: ' + err.message);
    }
});

module.exports = router;