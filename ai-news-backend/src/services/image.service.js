import { fal } from "@fal-ai/client";

// Ensure API Key exists
if (!process.env.FAL_KEY) {
  console.warn("⚠️ FAL_KEY is missing in .env. Image generation will be skipped.");
}

fal.config({
  credentials: process.env.FAL_KEY,
});

// 🎨 STYLE 1: HIGH-END TECH EDITORIAL (The Verge / Polygon Style)
// Best for: Market Analysis, Protocol Updates, Defi, Tech deep dives
const EDITORIAL_PROMPT = `
Style: Abstract Tech Editorial, Double Exposure, Data Visualization Art.
Visuals: Glassmorphism, glowing fiber optics, floating financial candlesticks, isometric geometry, intricate 3D render.
Colors: Deep navy background with neon cyan, magenta, and electric gold accents.
Mood: Sophisticated, institutional, intelligent, futuristic.
Composition: Minimalist center focus, clean negative space, rule of thirds.
`;

// 🐸 STYLE 2: MEME / CULTURE (The Reddit / Twitter / Degens Style)
// Best for: Dogecoin, Pepe, NFT drops, Community hype, Viral stories
const MEME_PROMPT = `
Style: High-Definition Digital Oil Painting, Satirical Caricature, Internet Culture Art.
Visuals: Exaggerated expressions, cosmic backgrounds, rocket ships, laser eyes, chaotic energy, surreal humor.
Colors: Vibrant, highly saturated, warm oranges, greens, and purples.
Mood: Hype, FOMO, fun, energetic, "To The Moon".
Reference: "Wojak" emotion but high-quality render, 4k digital art.
`;

// ⚖️ STYLE 3: SERIOUS / REGULATION (Bloomberg / WSJ Style)
// Best for: SEC lawsuits, Bans, Hacks, Government regulation, Crime
const SERIOUS_PROMPT = `
Style: Cinematic Photojournalism, Courtroom Sketch aesthetic mixed with Hyper-Realism.
Visuals: Gavels, government buildings, shredded documents, red tape, stormy skies, dramatic shadows.
Colors: Desaturated, cold blue, slate grey, steel, high contrast.
Mood: Tense, urgent, trustworthy, breaking news.
Composition: Dramatic angles, depth of field (bokeh).
`;

export const generateImage = async (headline, style = "EDITORIAL") => {
  if (!process.env.FAL_KEY) return null;

  try {
    // 1. Clean the headline to remove confusing chars
    const cleanSubject = headline.replace(/[:"()]/g, "").trim();
    const lowerHead = cleanSubject.toLowerCase();

    // 2. Smart Style Detection (Override 'style' based on content)
    let selectedPrompt = EDITORIAL_PROMPT; // Default

    // A. Detect MEME Context
    if (
        lowerHead.includes('doge') || 
        lowerHead.includes('pepe') || 
        lowerHead.includes('shib') || 
        lowerHead.includes('bonk') || 
        lowerHead.includes('wif') || 
        lowerHead.includes('meme') ||
        lowerHead.includes('moon')
    ) {
        selectedPrompt = MEME_PROMPT;
        style = "MEME";
    } 
    // B. Detect SERIOUS Context
    else if (
        lowerHead.includes('sec') || 
        lowerHead.includes('sue') || 
        lowerHead.includes('ban') || 
        lowerHead.includes('hack') || 
        lowerHead.includes('jail') || 
        lowerHead.includes('law') || 
        lowerHead.includes('arrest') ||
        lowerHead.includes('collapse')
    ) {
        selectedPrompt = SERIOUS_PROMPT;
        style = "SERIOUS";
    }

    console.log(`   🎨 Generating [${style}] Art for: "${cleanSubject.substring(0, 30)}..."`);

    // 3. Construct the Engineering Prompt
    const fullPrompt = `
    ${selectedPrompt}
    
    SUBJECT DIRECTIVE: Create a visual representation of: "${cleanSubject}".
    
    SCENE RULES:
    - If "Bitcoin" is mentioned, use an Orange/Gold circular motif or digital gold texture.
    - If "Ethereum" is mentioned, use a Blue/Purple diamond/crystal motif.
    - If "Bull" or "Rally", use upward trends, green lights, ascending geometry.
    - If "Bear" or "Crash", use downward trends, red lights, shattered glass.
    - NO TEXT: Do not attempt to write words, letters, or the headline inside the image.
    `;

    // 4. Call Flux (Schnell)
    // We disable safety checker for news (so "war" or "attack" headlines aren't blocked)
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: fullPrompt,
        image_size: "landscape_16_9",
        num_inference_steps: 4, 
        seed: Math.floor(Math.random() * 1000000), 
        enable_safety_checker: false, 
        guidance_scale: 7.0, // Slightly lower than 7.5 for more creativity
        sync_mode: true
      },
      logs: false, 
    });

    // 5. Extract URL safely
    const images = result.images || (result.data && result.data.images);

    if (images && images.length > 0) {
      return images[0].url;
    }
    
    console.warn("   ⚠️ Fal.ai returned no images.");
    return null;

  } catch (error) {
    console.error("   ❌ Image Gen Error:", error.message);
    return null; 
  }
};