import sanitizeHtml from 'sanitize-html';

export const cleanText = (text) => {
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

