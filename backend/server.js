// server.js

// 1. Import the tools we installed
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// 2. Load the secret configuration
dotenv.config();

// 3. Create the app
const app = express();
const PORT = process.env.PORT || 5000;

// 4. Middlewares (Security & Data parsing)
app.use(cors()); // Allow requests from other places
app.use(express.json()); // Allow the app to understand JSON data

// 5. Basic Route (To check if it works)
app.get('/', (req, res) => {
  res.send('CorpQueryX Backend is Running! 🚀');
});

// 6. Start the Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});