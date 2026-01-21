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
        if (!question) return res.status(400).json({ msg: 'Question is required' });

        console.log(`🤔 User asked: "${question}"`);

        // 1. Turn Question into Vector
        const queryVector = await getEmbedding(question);

        // 2. Search Qdrant (using Curl Wrapper)
        console.log("🔍 Searching Brain...");
        
        // Create temp search payload
        const searchPayload = {
            vector: queryVector,
            limit: 3, // Get top 3 most relevant chunks
            with_payload: true
        };
        const tempSearchPath = path.join('/tmp', `search_${Date.now()}.json`);
        fs.writeFileSync(tempSearchPath, JSON.stringify(searchPayload));

        // Prepare Curl Command
        const qdrantUrl = process.env.QDRANT_URL.replace(/\/$/, '');
        const apiKey = process.env.QDRANT_API_KEY;
        const cmd = `curl -s -X POST "${qdrantUrl}/collections/corp_documents/points/search" -H "api-key: ${apiKey}" -H "Content-Type: application/json" -d @${tempSearchPath}`;

        // Execute Search
        exec(cmd, async (error, stdout, stderr) => {
            // Cleanup
            if (fs.existsSync(tempSearchPath)) fs.unlinkSync(tempSearchPath);

            if (error) {
                console.error("❌ Search Error:", stderr);
                return res.status(500).json({ msg: 'Search failed' });
            }

            // Parse Qdrant Results
            const response = JSON.parse(stdout);
            const results = response.result || [];

            if (results.length === 0) {
                return res.json({ answer: "I couldn't find any relevant documents." });
            }

            // 3. Extract Text from Results
            const contextText = results.map(item => item.payload.text).join("\n\n---\n\n");
            console.log("📄 Found Context:", contextText.substring(0, 100) + "...");

            // 4. Generate Answer with Gemini
            console.log("🤖 Generating Answer...");
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