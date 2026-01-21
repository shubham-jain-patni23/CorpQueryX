// CorpQueryX/backend/scripts/initDB_axios.js
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function setupQdrant() {
    const qdrantUrl = process.env.QDRANT_URL;
    const apiKey = process.env.QDRANT_API_KEY;

    // Ensure URL doesn't have trailing slash
    const baseUrl = qdrantUrl.replace(/\/$/, '');
    const collectionName = 'corp_documents';

    console.log(`🔌 Connecting to: ${baseUrl} using Axios...`);

    const headers = {
        'api-key': apiKey,
        'Content-Type': 'application/json'
    };

    try {
        // 1. Check if collection exists
        try {
            await axios.get(`${baseUrl}/collections/${collectionName}`, { headers });
            console.log(`ℹ️  Collection '${collectionName}' exists. Deleting it to resize...`);
            
            // Delete it
            await axios.delete(`${baseUrl}/collections/${collectionName}`, { headers });
            console.log(`🗑️  Old collection deleted.`);
        } catch (err) {
            // If 404, it means it doesn't exist, which is good
            if (err.response && err.response.status === 404) {
                console.log(`ℹ️  Collection does not exist yet. Creating it...`);
            } else {
                throw err;
            }
        }

        // 2. Create Collection (Gemini Size: 768)
        const payload = {
            vectors: {
                size: 768,
                distance: "Cosine"
            }
        };

        await axios.put(`${baseUrl}/collections/${collectionName}`, payload, { headers });

        console.log(`✅ SUCCESS! Collection '${collectionName}' created with size 768.`);
        console.log(`🧠 The Brain is Ready.`);

    } catch (err) {
        console.error("❌ Axios Error:", err.message);
        if (err.response) {
            console.error("Server Response:", err.response.data);
        }
    }
}

setupQdrant();