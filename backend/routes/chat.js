// CorpQueryX/backend/routes/chat.js

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { getEmbedding, generateAnswer } = require('../utils/ai');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, async (req, res) => {
    try {
        const { question } = req.body;
        // 1. GET USER CLEARANCE LEVEL
        // Default to Level 1 (Intern) if undefined
        const userRoleLevel = req.user.role_id || 1; 

        if (!question) return res.status(400).json({ msg: 'Question is required' });

        console.log(`🤔 User (Level ${userRoleLevel}) asked: "${question}"`);

        // 2. Turn Question into Vector
        const queryVector = await getEmbedding(question);

        // 3. Search Qdrant WITH SECURITY FILTER
        console.log("🔍 Searching Brain with Clearance Check...");
        
        const searchPayload = {
            vector: queryVector,
            limit: 3,
            with_payload: true,
            filter: {
                must: [
                    {
                        key: "min_role_level",
                        range: {
                            lte: userRoleLevel // User can only see docs <= their level
                        }
                    }
                ]
            }
        };

        const tempSearchPath = path.join('/tmp', `search_${Date.now()}.json`);
        fs.writeFileSync(tempSearchPath, JSON.stringify(searchPayload));

        const qdrantUrl = process.env.QDRANT_URL.replace(/\/$/, '');
        const apiKey = process.env.QDRANT_API_KEY;
        const cmd = `curl -s -X POST "${qdrantUrl}/collections/corp_documents/points/search" -H "api-key: ${apiKey}" -H "Content-Type: application/json" -d @${tempSearchPath}`;

        

        // --- 🕵️‍♂️ ADD THIS DEBUG BLOCK ---
        console.log("------------------------------------------------");
        console.log("🔍 DEBUG: Sending Search to Qdrant:");
        console.log(JSON.stringify(searchPayload, null, 2));
        console.log("------------------------------------------------");
        // ------------------------------------------------

        exec(cmd, async (error, stdout, stderr) => {
            if (fs.existsSync(tempSearchPath)) fs.unlinkSync(tempSearchPath);

            if (error) {
                console.error("❌ Search Error:", stderr);
                return res.status(500).json({ msg: 'Search failed' });
            }

            const response = JSON.parse(stdout);
            const results = response.result || [];

            //
            console.log(`📊 DEBUG: Qdrant returned ${results.length} matches.`);
            // -----------------------------

            if (results.length === 0) {
                console.log("🚫 Access Denied or No Info Found.");
                return res.json({ answer: "I cannot find any information available for your security clearance." });
            }

            // 4. Found Allowed Docs -> Generate Answer
            const contextText = results.map(item => item.payload.text).join("\n\n---\n\n");
            console.log(`📄 Found ${results.length} valid documents.`);

            const aiAnswer = await generateAnswer(question, contextText);

            res.json({ 
                answer: aiAnswer, 
                sources: results.map(r => r.payload.metadata.title) 
            });
        });

    } catch (err) {
        console.error("❌ Chat Error:", err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;