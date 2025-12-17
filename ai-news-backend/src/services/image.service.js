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
const MEME_VARIANTS = [
  // Style A: The 3D Character (Pixar/Fortnite vibe)
  `Style: High-quality 3D Render, Pixar-style character art.
   Visuals: A cute 3D character (Shiba Inu or Pepe) wearing a suit, holding a rocket, shocked expression, colorful background.
   Mood: Fun, Hype, Cartoonish.`,

  // Style B: The Retro Game (Pixel Art)
  `Style: 8-bit Pixel Art, Retro Video Game aesthetic.
   Visuals: A pixelated "To The Moon" rocket ship, green candles, coins collecting, arcade UI overlay.
   Mood: Nostalgic, Gamified, Fun.`,

  // Style C: The Vaporwave Trip
  `Style: Vaporwave, Synthwave, 80s Retro Futurism.
   Visuals: Neon grid landscape, greek statues wearing VR headsets, floating coins, pink and purple lasers.
   Mood: Trippy, Chill, Internet Culture.`,
   
  // Style D: The Comic Book
  `Style: Pop Art Comic Book illustration, Ben-Day dots.
   Visuals: Dramatic comic panel, character screaming "BUY!", speech bubbles, dynamic action lines.
   Mood: Energetic, Expressive.`
];

const EDITORIAL_VARIANTS = [
  // Style A: Abstract Tech
  `Style: Abstract 3D Data Visualization, Glassmorphism.
   Visuals: Floating glass charts, glowing fiber optics, depth of field, minimalist geometry.
   Colors: Deep Navy & Electric Cyan.`,

  // Style B: The Blueprint
  `Style: Architectural Blueprint, Technical Drawing.
   Visuals: White wireframe schematics on blue background, grid lines, technical annotations of a crypto coin.
   Colors: Blueprint Blue & White.`,

  // Style C: The Double Exposure
  `Style: Artistic Double Exposure Photography.
   Visuals: Silhouette of a businessman merged with a digital city skyline, glowing nodes.
   Mood: Sophisticated, Thought-provoking.`
];

const SERIOUS_VARIANTS = [
  // Style A: Cinematic Noir
  `Style: Neo-Noir Cinematic Shot, Dramatic Lighting.
   Visuals: A gavel on a desk, shadows of prison bars, rain on a window, moody atmosphere.
   Colors: Steel Grey, Black, Muted Blue.`,

  // Style B: The Glitch
  `Style: Dark Glitch Art, Cyber-security warning.
   Visuals: Red warning screens, corrupted digital data, hooded hacker silhouette, shattered screen effect.
   Colors: Black & Red.`
]; 

const getRandomStyle = (variants) => {
  return variants[Math.floor(Math.random() * variants.length)];
};

export const generateImage = async (headline, category = "EDITORIAL") => {
  if (!process.env.FAL_KEY) return null;

  try {
    // 1. Clean the headline
    const cleanSubject = headline.replace(/[:"()]/g, "").trim();
    const lowerHead = cleanSubject.toLowerCase();

    // 2. Smart Category & Variant Selection
    let selectedVariant = getRandomStyle(EDITORIAL_VARIANTS); // Default

    // A. Detect MEME Context
    if (
        lowerHead.includes('doge') || 
        lowerHead.includes('pepe') || 
        lowerHead.includes('shib') || 
        lowerHead.includes('bonk') || 
        lowerHead.includes('wif') || 
        lowerHead.includes('meme') ||
        lowerHead.includes('moon') ||
        lowerHead.includes('rally') || 
        lowerHead.includes('surge')
    ) {
        selectedVariant = getRandomStyle(MEME_VARIANTS);
        category = "MEME";
    } 
    // B. Detect SERIOUS Context
    else if (
        lowerHead.includes('sec') || 
        lowerHead.includes('sue') || 
        lowerHead.includes('ban') || 
        lowerHead.includes('hack') || 
        lowerHead.includes('jail') || 
        lowerHead.includes('law') || 
        lowerHead.includes('fraud') ||
        lowerHead.includes('collapse')
    ) {
        selectedVariant = getRandomStyle(SERIOUS_VARIANTS);
        category = "SERIOUS";
    }

    console.log(`   🎨 Generating [${category}] Art for: "${cleanSubject.substring(0, 30)}..."`);

    // 3. Construct the Engineering Prompt
    const fullPrompt = `
    ${selectedVariant}
    
    SUBJECT DIRECTIVE: Create an image representing: "${cleanSubject}".
    
    SCENE RULES:
    - If "Bitcoin" is mentioned, show a glowing Orange Gold coin.
    - If "Ethereum" is mentioned, show a glowing Blue Crystal.
    - If "Bull", show green arrows pointing up.
    - If "Bear", show red arrows pointing down.
    - NO TEXT: Do not attempt to spell words.
    - QUALITY: Masterpiece, 4k, sharp focus.
    `;

    // 4. Call Flux (Schnell)
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: fullPrompt,
        image_size: "landscape_16_9",
        num_inference_steps: 4, 
        seed: Math.floor(Math.random() * 1000000), 
        enable_safety_checker: false, 
        // ⚠️ CRITICAL: Low guidance allows Flux to be "creative" with styles
        // High guidance (7+) forces it to ignore the style prompts and look generic.
        guidance_scale: 2.5, 
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