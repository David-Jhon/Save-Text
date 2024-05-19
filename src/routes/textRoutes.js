const express = require('express');
const router = express.Router();
const Text = require('../models/Text');

router.post('/save', async (req, res) => {
    const { title, content, expireOption } = req.body;

    const expireAt = (() => {
        const now = new Date();
        switch (expireOption) {
            case '1 year': return new Date(now.setFullYear(now.getFullYear() + 1));
            case '1 month': return new Date(now.setMonth(now.getMonth() + 1));
            case '1 week': return new Date(now.setDate(now.getDate() + 7));
            case '1 day': return new Date(now.setDate(now.getDate() + 1));
            case '1 hour': return new Date(now.setHours(now.getHours() + 1));
            default: return null;
        }
    })();

    const text = new Text({ title, content, expireAt });
    await text.save();

    res.json({ url: `https://save-text.onrender.com/${title}-${text.uuid}` });
});

router.get('/:uuid', async (req, res) => {
    const { uuid } = req.params;
    const text = await Text.findOne({ uuid });
    if (text) {
        res.json(text);
    } else {
        res.status(404).send('Not found');
    }
});

router.delete('/:uuid', async (req, res) => {
    const { uuid } = req.params;
    await Text.findOneAndDelete({ uuid });
    res.sendStatus(204);
});

module.exports = router;
