// CorpQueryX/backend/scripts/initVectorDB.js

const { QdrantClient } = require('@qdrant/js-client-rest');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const initQdrant = async () => {
    // Debugging: Check if secrets are loaded (Don't show the full key!)
    if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
        console.error("❌ Error: QDRANT_URL or QDRANT_API_KEY is missing in .env");
        return;
    }

    console.log(`🔌 Connecting to: ${process.env.QDRANT_URL}`);

    try {
        const client = new QdrantClient({
            url: process.env.QDRANT_URL,
            apiKey: process.env.QDRANT_API_KEY,
            port: 443,   // <--- FORCE Port 443 (Cloud)
            tls: true,   // <--- FORCE Secure Connection
            family: 4,
        });

        const collectionName = 'corp_documents';

        // 1. DELETE OLD COLLECTION (Resize Attempt)
        try {
            await client.deleteCollection(collectionName);
            console.log(`🗑️  Old collection '${collectionName}' deleted (Resizing for Gemini).`);
        } catch (e) {
            // Ignore if it didn't exist
        }

        // 2. CREATE NEW COLLECTION (Gemini Size: 768)
        await client.createCollection(collectionName, {
            vectors: {
                size: 768, 
                distance: 'Cosine',
            },
        });

        console.log(`✅ New Collection '${collectionName}' created successfully!`);
        console.log('🧠 The AI Brain is ready for Gemini (Size: 768).');

    } catch (err) {
        console.error('❌ Error initializing Qdrant:', err);
        // If there is a 'cause', print it too (helps debugging)
        if (err.cause) console.error('🔍 Cause:', err.cause);
    }
};

initQdrant();