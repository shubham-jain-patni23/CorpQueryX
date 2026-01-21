// CorpQueryX/backend/utils/ai.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 1. Convert Text to Vectors
async function getEmbedding(text) {
    try {
        const cleanText = text.replace(/\n/g, " ");
        const result = await embeddingModel.embedContent(cleanText);
        return result.embedding.values;
    } catch (error) {
        console.error("Embedding Error:", error);
        throw error;
    }
}

// 2. Generate Answer based on Context
async function generateAnswer(question, context) {
    try {
        const prompt = `
        You are a helpful corporate assistant. Use the following context to answer the user's question.
        If the answer is not in the context, say "I don't find that information in the documents."
        
        Context:
        ${context}

        Question: ${question}
        `;

        const result = await chatModel.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Generation Error:", error);
        throw error;
    }
}

module.exports = { getEmbedding, generateAnswer };