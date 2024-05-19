const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const textSchema = new mongoose.Schema({
    title: String,
    content: String,
    uuid: { type: String, default: uuidv4 },
    expireAt: Date
});

textSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Text', textSchema);
