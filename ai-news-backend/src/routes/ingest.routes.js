const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { fetchRSS } = require('../services/fetcher.service');

// GET /api/ingest/status -> See the latest 50 processed articles
router.get('/status', async (req, res) => {
    try {
        const latestNews = await prisma.cleanedNews.findMany({
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: { category: true } // Include category name
        });
        res.json({ count: latestNews.length, data: latestNews });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/ingest/manual -> Manually trigger an RSS fetch
router.post('/manual', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: "Missing 'url' in body" });
    }

    try {
        console.log(`🔌 Manual Trigger: ${url}`);
        // This function already handles Dedupe + Queueing!
        const count = await fetchRSS(url); 
        
        res.json({ 
            message: "Ingestion started", 
            newItemsQueued: count 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;