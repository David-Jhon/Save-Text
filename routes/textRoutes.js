const express = require('express');
const router = express.Router();
const shortid = require('shortid');
const Text = require('../models/Text');


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
        case 'no expire':
        default:
            return null;
    }
}

// Helper function to escape HTML characters
function escapeHtml(text) {
    return text.replace(/[&<>"']/g, function (match) {
        switch (match) {
            case '&':
                return '&amp;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '"':
                return '&quot;';
            case "'":
                return '&#39;';
        }
    });
}

router.post('/save', async (req, res) => {
    const { title, content, expireOption } = req.body;
    if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Text content cannot be empty!' });
    }
    const uniqueId = shortid.generate();
    const expireAt = getExpiryDate(expireOption);
    const newText = new Text({
        title: title || 'Untitled',
        content,
        expireOption,
        uniqueId,
        expireAt,
        userId: req.user ? req.user.id : null
    });
    try {
        await newText.save();
        res.json({ url: `${uniqueId}` });
    } catch (error) {
        console.error("Error saving text:", error);
        res.status(500).json({ error: 'Failed to save text' });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { title, content, expireOption } = req.body;

    if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Text content cannot be empty!' });
    }

    const query = { uniqueId: id };
    // If user is logged in, they can update their own texts OR public anonymous texts
    // If not logged in, they can only update public anonymous texts
    if (req.user) {
        query.$or = [{ userId: req.user.id }, { userId: null }];
    } else {
        query.userId = null; // Only allow updating anonymous texts if not logged in
    }

    const expireAt = getExpiryDate(expireOption);
    const update = {
        title: title || 'Untitled',
        content,
        expireOption,
        expireAt
    };

    try {
        const updatedText = await Text.findOneAndUpdate(query, update, { new: true });
        if (updatedText) {
            res.json({ message: 'Text updated successfully', url: id });
        } else {
            res.status(404).json({ error: 'Text not found or you are not authorized to update it.' });
        }
    } catch (error) {
        console.error("Error updating text:", error);
        res.status(500).json({ error: 'Failed to update text' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const query = { uniqueId: id };

    if (req.user) {
        query.$or = [{ userId: req.user.id }, { userId: null }];
    } else {
        query.userId = null;
    }

    try {
        const deletedText = await Text.findOneAndDelete(query);
        if (deletedText) {
            res.json({ message: 'Text deleted successfully' });
        } else {
            res.status(404).json({ error: 'Text not found or you are not authorized to delete it.' });
        }
    } catch (error) {
        console.error("Error deleting text:", error);
        res.status(500).json({ error: 'Failed to delete text' });
    }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const text = await Text.findOne({ uniqueId: id });
        if (text) {
            const escapedTitle = escapeHtml(text.title);
            const escapedContent = escapeHtml(text.content);

            // Determine if the current viewer can modify this text.
            // True if:
            // 1. The text is anonymous (text.userId is null)
            // 2. The user is logged in AND text.userId matches req.user.id
            let canModify = true;
            if (!text.userId) { // Anonymous text
                canModify = true;
            } else if (req.user && text.userId === req.user.id) { // Owned by current logged-in user
                canModify = true;
            }

            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${escapedTitle || 'Untitled Text'}</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                    <style>
                        body {
                            font-family: 'Inter', sans-serif;
                        }
                        textarea::-webkit-scrollbar {
                            width: 8px;
                        }
                        textarea::-webkit-scrollbar-track {
                            background: #2d3748; /* bg-gray-700 */
                        }
                        textarea::-webkit-scrollbar-thumb {
                            background: #4a5568; /* bg-gray-600 */
                            border-radius: 4px;
                        }
                        textarea::-webkit-scrollbar-thumb:hover {
                            background: #718096; /* bg-gray-500 */
                        }
                    </style>
                </head>
                <body class="bg-gray-900 text-gray-100 min-h-screen flex flex-col items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
                    <div class="w-full max-w-2xl bg-gray-800 rounded-lg shadow-xl p-6 md:p-8">
                        <h1 class="text-3xl font-bold mb-6 text-gray-100 text-center">${escapedTitle || 'Untitled Text'}</h1>
                        
                        <label for="title" class="block text-sm font-medium text-gray-300 mb-1">Title</label>
                        <input type="text" id="titleInput" value="${escapedTitle || ''}" placeholder="Enter title..." 
                               class="w-full p-3 mb-4 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400">
                        
                        <label for="content" class="block text-sm font-medium text-gray-300 mb-1">Content</label>
                        <textarea id="contentInput" placeholder="Your text here..."
                                  class="w-full p-3 mb-4 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 h-72 md:h-80 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400">${escapedContent}</textarea>
                        
                        <label for="expireOption" class="block text-sm font-medium text-gray-300 mb-1">Expiration</label>
                        <select id="expireOptionInput" 
                                class="w-full p-3 mb-6 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="no expire" ${text.expireOption === 'no expire' ? 'selected' : ''}>No Expire</option>
                            <option value="1 hour" ${text.expireOption === '1 hour' ? 'selected' : ''}>1 Hour</option>
                            <option value="1 day" ${text.expireOption === '1 day' ? 'selected' : ''}>1 Day</option>
                            <option value="1 week" ${text.expireOption === '1 week' ? 'selected' : ''}>1 Week</option>
                            <option value="1 month" ${text.expireOption === '1 month' ? 'selected' : ''}>1 Month</option>
                            <option value="1 year" ${text.expireOption === '1 year' ? 'selected' : ''}>1 Year</option>
                        </select>
                        
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                            <button id="saveBtn" onclick="saveText()" class="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">Save</button>
                            <button onclick="viewRaw()" class="w-full px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50">View Raw</button>
                            <button onclick="copyText()" class="w-full px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50">Copy</button>
                            <button id="deleteBtn" onclick="deleteText()" class="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">Delete</button>
                        </div>

                        <div class="text-center">
                            <a href="/" class="text-blue-400 hover:text-blue-300 hover:underline transition duration-150 ease-in-out">← Back to Home</a>
                        </div>
                    </div>
                    
                    <script>
                        const textId = '${id}';
                        const currentToken = localStorage.getItem('token');
                        const canModifyClient = ${canModify}; // Use the server-determined value

                        const titleField = document.getElementById('titleInput');
                        const contentField = document.getElementById('contentInput');
                        const expireOptionField = document.getElementById('expireOptionInput');
                        const saveButton = document.getElementById('saveBtn');
                        const deleteButton = document.getElementById('deleteBtn');

                        if (!canModifyClient) {
                            titleField.disabled = true;
                            contentField.disabled = true;
                            expireOptionField.disabled = true;
                            saveButton.disabled = true;
                            deleteButton.disabled = true;

                            [titleField, contentField, expireOptionField, saveButton, deleteButton].forEach(el => {
                                el.classList.add('opacity-70', 'cursor-not-allowed');
                            });
                        }

                        function viewRaw() {
                            window.open('/api/texts/' + textId + '/raw', '_blank');
                        }

                        function copyText() {
                            contentField.select();
                            contentField.setSelectionRange(0, 99999); // For mobile devices
                            try {
                                document.execCommand('copy');
                            } catch (err) {
                                alert('Failed to copy text. Your browser might not support this feature or permissions are denied.');
                            }
                        }

                        async function saveText() {
                            if (!canModifyClient) {
                                alert("You are not authorized to modify this text.");
                                return;
                            }
                            const title = titleField.value;
                            const content = contentField.value;
                            const expireOption = expireOptionField.value;

                            if (!content.trim()) {
                                alert('Content cannot be empty.');
                                return;
                            }
                            
                            const requestHeaders = { 'Content-Type': 'application/json' };
                            if (currentToken) {
                                requestHeaders['Authorization'] = 'Bearer ' + currentToken;
                            }

                            try {
                                const response = await fetch('/api/texts/' + textId, {
                                    method: 'PUT',
                                    headers: requestHeaders,
                                    body: JSON.stringify({ title, content, expireOption })
                                });
                                const result = await response.json();
                                if (response.ok) {
                                    alert('Text updated successfully!');
                                    document.querySelector('h1').textContent = title || 'Untitled Text';
                                    document.title = title || 'Untitled Text';
                                } else {
                                    alert(result.error || 'Failed to update text. You may not be authorized.');
                                }
                            } catch (error) {
                                console.error('Error updating text:', error);
                                alert('Error updating text. Please check console or try again.');
                            }
                        }

                        async function deleteText() {
                             if (!canModifyClient) {
                                alert("You are not authorized to delete this text.");
                                return;
                            }
                            if (!confirm('Are you sure you want to delete this text?')) {
                                return;
                            }

                            const requestHeaders = {};
                            if (currentToken) {
                                requestHeaders['Authorization'] = 'Bearer ' + currentToken;
                            }

                            try {
                                const response = await fetch('/api/texts/' + textId, {
                                    method: 'DELETE',
                                    headers: requestHeaders
                                });
                                if (response.ok) {
                                    alert('Text deleted successfully');
                                    window.location.href = '/';
                                } else {
                                    const result = await response.json().catch(() => ({error: 'Failed to delete text.'}));
                                    alert(result.error || 'Failed to delete text: Not authorized or text not found.');
                                }
                            } catch (error) {
                                console.error('Error deleting text:', error);
                                alert('Error deleting text. Please check console or try again.');
                            }
                        }
                    </script>
                </body>
                </html>
            `);
        } else {
            res.status(404).send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Text Not Found</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                    <style>body { font-family: 'Inter', sans-serif; }</style>
                </head>
                <body class="bg-gray-900 text-gray-100 min-h-screen flex flex-col items-center justify-center p-4">
                    <div class="text-center">
                        <h1 class="text-4xl font-bold text-red-500 mb-4">404 - Text Not Found</h1>
                        <p class="text-xl text-gray-300 mb-8">The text you are looking for does not exist or may have expired.</p>
                        <a href="/" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-150 ease-in-out">Go to Homepage</a>
                    </div>
                </body>
                </html>
            `);
        }
    } catch (error) {
        console.error("Error fetching text by ID:", error);
        res.status(500).send(`
             <!DOCTYPE html>
             <html lang="en">
             <head>
                 <meta charset="UTF-8">
                 <meta name="viewport" content="width=device-width, initial-scale=1.0">
                 <title>Server Error</title>
                 <script src="https://cdn.tailwindcss.com"></script>
                 <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                 <style>body { font-family: 'Inter', sans-serif; }</style>
             </head>
             <body class="bg-gray-900 text-gray-100 min-h-screen flex flex-col items-center justify-center p-4">
                 <div class="text-center">
                     <h1 class="text-4xl font-bold text-orange-500 mb-4">500 - Server Error</h1>
                     <p class="text-xl text-gray-300 mb-8">Something went wrong on our end. Please try again later.</p>
                     <a href="/" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-150 ease-in-out">Go to Homepage</a>
                 </div>
             </body>
             </html>
        `);
    }
});

router.get('/:id/raw', async (req, res) => {
    const { id } = req.params;
    try {
        const text = await Text.findOne({ uniqueId: id });
        if (text) {
            res.type('text/plain');
            res.send(text.content);
        } else {
            res.status(404).type('text/plain').send('Text not found');
        }
    } catch (error) {
        console.error("Error fetching raw text:", error);
        res.status(500).type('text/plain').send('Failed to fetch raw text');
    }
});


router.get('/', async (req, res) => {
    try {
        const publicTexts = await Text.find({ userId: null });
        let myTexts = [];
        
        if (req.user) {
            myTexts = await Text.find({ userId: req.user.id });
        }
        
        res.json({ myTexts, publicTexts });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch texts' });
    }
});

module.exports = router;