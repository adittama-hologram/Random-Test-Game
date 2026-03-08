const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
    playerName: {
        type: String,
        required: true,
        trim: true
    },
    playerScore: {
        type: Number,
        required: true,
        default: 0
    },
    cpuScore: {
        type: Number,
        required: true,
        default: 0
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Score', scoreSchema);
