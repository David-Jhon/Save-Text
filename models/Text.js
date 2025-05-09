const mongoose = require('mongoose');

const textSchema = new mongoose.Schema({
    title: String,
    content: String,
    expireOption: String,
    uniqueId: { type: String, unique: true, required: true },
    expireAt: Date,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
});

textSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Text', textSchema);