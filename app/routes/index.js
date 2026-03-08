const express = require('express');
const router = express.Router();

const Score = require('../models/Score');

router.get('/test', (req, res) => {
    res.json({ message: 'API is working!', status: 'success' });
});

// Save a new score
router.post('/scores', async (req, res) => {
    try {
        const { playerName, playerScore, cpuScore } = req.body;
        const newScore = new Score({ playerName, playerScore, cpuScore });
        await newScore.save();
        res.status(201).json(newScore);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get top 10 scores
router.get('/scores', async (req, res) => {
    try {
        const scores = await Score.find()
            .sort({ playerScore: -1 })
            .limit(10);
        res.json(scores);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
