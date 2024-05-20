const express = require('express');
const router = express.Router();
const shortid = require('shortid');
const Text = require('../models/Text');

// Helper function to calculate expiration date
function getExpiryDate(expireOption) {
    const now = new Date();
    switch (expireOption) {
        case '1 hour':
            return new Date(now.getTime() + 60 * 60 * 1000);
        case '1 day':
            return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        case '1 week':
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        case '1 month':
            return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        case '1 year':
            return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        default:
            return null;
    }
}

router.post('/save', async (req, res) => {
    const { title, content, expireOption } = req.body;
    if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Text field cannot be empty!' });
    }
    const uniqueId = shortid.generate();
    const newText = new Text({ title, content, expireOption, uniqueId });
    await newText.save();

    res.json({ url: `${uniqueId}` });
});

// Get text by unique ID and render the full HTML page
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const text = await Text.findOne({ uniqueId: id });
    if (text) {
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${text.title}</title>
                <link rel="stylesheet" href="/styles.css">
            </head>
            <body>
                <div class="container">
                    <h1>${text.title}</h1>
                    <textarea id="content">${text.content}</textarea>
                    <div class="button-container">
                        <button onclick="viewRaw()">View Raw</button>
                        <button onclick="copyText()">Copy</button>
                        <button onclick="deleteText()">Delete</button>
                    </div>
                </div>
                <script>
                    function viewRaw() {
                        window.location.href = '/api/texts/${id}/raw';
                    }

                    function copyText() {
                        const content = document.getElementById('content');
                        content.select();
                        document.execCommand('copy');
                    }

                    async function deleteText() {
                        await fetch('/api/texts/${id}', { method: 'DELETE' });
                        alert('Text deleted');
                        window.location.href = '/';
                    }
                </script>
            </body>
            </html>
        `);
    } else {
        res.status(404).send('Text not found');
    }
});

// Get raw text by unique ID
router.get('/:id/raw', async (req, res) => {
    const { id } = req.params;
    const text = await Text.findOne({ uniqueId: id });
    if (text) {
        res.type('text/plain');
        res.send(text.content);
    } else {
        res.status(404).send('Text not found');
    }
});

// Delete text by unique ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    await Text.findOneAndDelete({ uniqueId: id });
    res.send('Text deleted');
});

module.exports = router;
