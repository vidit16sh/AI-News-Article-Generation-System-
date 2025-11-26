// Uses Pollinations.ai (Free, No API Key needed) for instant AI images
// Later you can swap this for OpenAI DALL-E
const generateImage = async (headline) => {
    try {
        // Clean headline for URL (remove special chars)
        const prompt = encodeURIComponent(headline.replace(/[^a-zA-Z0-9 ]/g, ""));
        
        // Pollinations generates image on the fly via URL
        const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=576&nologo=true`;
        
        return imageUrl;
    } catch (error) {
        console.error("❌ Image Gen Error:", error.message);
        return null;
    }
};

module.exports = { generateImage };