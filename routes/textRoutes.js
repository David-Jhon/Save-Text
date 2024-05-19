const express = require('express');
const router = express.Router();
const Text = require('./models/text');

// Save text
router.post('/save', async (req, res) => {
    const { title, content, expireOption } = req.body;
    const newText = new Text({ title, content, expireOption });
    await newText.save();

    res.json({ url: `https://${req.hostname}/${title}-${newText._id}` });
});

// Get text by ID
router.get('/:id', async (req, res) => {
    const id = req.params.id.split('-').pop();
    const text = await Text.findById(id);

    if (text) {
        res.send(`
            <html>
            <head>
                <title>${text.title}</title>
            </head>
            <body>
                <pre>${text.content}</pre>
            </body>
            </html>
        `);
    } else {
        res.status(404).send('Text not found');
    }
});

// Get raw text by ID
router.get('/:id/raw', async (req, res) => {
    const id = req.params.id.split('-').pop();
    const text = await Text.findById(id);

    if (text) {
        res.json({ title: text.title, content: text.content });
    } else {
        res.status(404).send('Text not found');
    }
});

// Delete text by ID
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    await Text.findByIdAndDelete(id);
    res.send('Text deleted');
});

module.exports = router;
