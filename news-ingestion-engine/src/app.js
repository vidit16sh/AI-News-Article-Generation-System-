require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const ingestRoutes = require('./routes/ingest.routes');

const app = express();

// Security & Parsing
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/ingest', ingestRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 API Server running on port ${PORT}`);
});