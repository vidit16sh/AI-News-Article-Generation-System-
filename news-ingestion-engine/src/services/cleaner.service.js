const sanitizeHtml = require('sanitize-html');

const cleanText = (text) => {
    if (!text) return "";
    
    // 1. Remove HTML tags (allow nothing)
    let clean = sanitizeHtml(text, {
        allowedTags: [], 
        allowedAttributes: {}
    });

    // 2. Remove common RSS clutter
    clean = clean.replace(/Continue Reading|Read more|Click here/gi, '');

    // 3. Fix weird spacing (newlines to spaces)
    clean = clean.replace(/\s+/g, ' ').trim();

    return clean;
};

module.exports = { cleanText };