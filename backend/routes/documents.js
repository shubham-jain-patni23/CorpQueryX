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

// --- NEW LIBRARY (More Stable) ---
const pdfExtract = require('pdf-extraction');

// Configure Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, 'uploads/'); },
    filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage });

router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        // --- 🔒 NEW SECURITY CHECK ---
        // If the user's role is LESS than 10, kick them out.
        if (req.user.role_id < 10) {
            console.log(`🚫 Blocked upload attempt by User ID ${req.user.id} (Level ${req.user.role_id})`);
            return res.status(403).json({ msg: 'Access Denied: Only Level 10 (Admins) can upload documents.' });
        }
        // -----------------------------
        const { title, min_role_level } = req.body;
        const filePath = req.file.path;
        const userId = req.user.id;
        const mimeType = req.file.mimetype;

        console.log(`📂 Processing file: ${req.file.originalname} (${mimeType})`);

        // 1. Save to PostgreSQL
        const newDoc = await db.query(
            'INSERT INTO documents (title, file_path, uploaded_by, min_role_level) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, filePath, userId, min_role_level || 10]
        );
        const docId = newDoc.rows[0].id;

        // 2. EXTRACT TEXT
        let fileContent = "";

        if (mimeType === 'application/pdf') {
            console.log("📄 Detected PDF. Extracting text...");
            
            const dataBuffer = fs.readFileSync(filePath);
            
            // This library handles the promise and parsing automatically
            const data = await pdfExtract(dataBuffer);
            fileContent = data.text;
            
            // Cleanup: PDF text often has weird spacing
            fileContent = fileContent.replace(/\n\n+/g, '\n').trim();
        } else {
            console.log("📝 Detected Text File. Reading directly...");
            fileContent = fs.readFileSync(filePath, 'utf-8');
        }

        if (!fileContent || fileContent.length < 10) {
            throw new Error("File is empty or text could not be extracted.");
        }

        console.log(`✅ Extracted ${fileContent.length} characters of text.`);

        // 3. Get Vectors
        console.log("🧠 Generating AI Embeddings...");
        const vector = await getEmbedding(fileContent);

        // // 4. Save to Qdrant (Curl Wrapper)
        // console.log("💾 Saving to Qdrant...");
        
        // 4. Save to Qdrant (With Security Stamp)
        console.log(`💾 Saving to Qdrant (Security Level: ${min_role_level || 10})...`);
        
        const payload = {
            points: [{
                id: docId,
                vector: vector,
                payload: { 
                    text: fileContent, 
                    metadata: { title: title },
                    min_role_level: parseInt(min_role_level) || 10 // <--- THE SECURITY STAMP
                }
            }]
        };

        const tempPayloadPath = path.join('/tmp', `temp_${Date.now()}.json`);
        fs.writeFileSync(tempPayloadPath, JSON.stringify(payload));

        const qdrantUrl = process.env.QDRANT_URL.replace(/\/$/, '');
        const apiKey = process.env.QDRANT_API_KEY;
        const cmd = `curl -s -X PUT "${qdrantUrl}/collections/corp_documents/points?wait=true" -H "api-key: ${apiKey}" -H "Content-Type: application/json" -d @${tempPayloadPath}`;

        exec(cmd, (error, stdout, stderr) => {
            if (fs.existsSync(tempPayloadPath)) fs.unlinkSync(tempPayloadPath);

            if (error) {
                console.error("❌ Curl Error:", stderr);
                return res.status(500).json({ msg: 'Failed to save to Brain', error: stderr });
            }

            if (stdout.includes('"status":"ok"')) {
                console.log("✅ Document Processed Successfully!");
                res.json({ msg: 'Document Learned Successfully', document: newDoc.rows[0] });
            } else {
                res.status(500).json({ msg: 'Qdrant Error', details: stdout });
            }
        });

    } catch (err) {
        console.error("❌ Processing Error:", err);
        res.status(500).send('Server Error: ' + err.message);
    }
});

// --- DELETE DOCUMENT (Admin Only) ---
router.delete('/:id', auth, async (req, res) => {
    try {
        // 1. Security Check (Admins Only)
        if (req.user.role_id < 10) {
            return res.status(403).json({ msg: 'Access Denied' });
        }

        const docId = req.params.id;

        // 2. Get File Info (to find the path)
        const docResult = await db.query('SELECT * FROM documents WHERE id = $1', [docId]);
        if (docResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Document not found' });
        }
        const file = docResult.rows[0];

        // 3. Delete from Qdrant (The Brain)
        // We use the "points/delete" endpoint
        const qdrantUrl = process.env.QDRANT_URL.replace(/\/$/, '');
        const apiKey = process.env.QDRANT_API_KEY;
        
        const deletePayload = JSON.stringify({ points: [parseInt(docId)] });
        const tempDeletePath = path.join('/tmp', `delete_${Date.now()}.json`);
        fs.writeFileSync(tempDeletePath, deletePayload);

        const cmd = `curl -X POST "${qdrantUrl}/collections/corp_documents/points/delete" -H "api-key: ${apiKey}" -H "Content-Type: application/json" -d @${tempDeletePath}`;

        exec(cmd, async (error, stdout, stderr) => {
            if (fs.existsSync(tempDeletePath)) fs.unlinkSync(tempDeletePath);
            
            // 4. Delete Physical File
            if (fs.existsSync(file.file_path)) {
                fs.unlinkSync(file.file_path);
            }

            // 5. Delete from Database
            await db.query('DELETE FROM documents WHERE id = $1', [docId]);

            console.log(`🗑️ Deleted Document ID ${docId}: ${file.title}`);
            res.json({ msg: 'Document Deleted Successfully' });
        });

    } catch (err) {
        console.error("Delete Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// --- LIST DOCUMENTS (New Route to see what to delete) ---
router.get('/', auth, async (req, res) => {
    try {
        // Admins see all, others see only their level? 
        // For simplicity, let's just list everything for Admins to manage.
        if (req.user.role_id < 10) return res.status(403).json({ msg: 'Admin only' });

        const result = await db.query('SELECT id, title, created_at, min_role_level FROM documents ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;