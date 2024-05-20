const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const textRoutes = require('./routes/textRoutes');

const app = express();

const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB', err));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/texts', textRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const Text = require('./models/Text');

async function deleteExpiredTexts() {
    const now = new Date();
    const result = await Text.deleteMany({ expireAt: { $lte: now } });
    if (result.deletedCount > 0) {
        console.log(`${result.deletedCount} expired text(s) deleted`);
    }
}

setInterval(deleteExpiredTexts, 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
