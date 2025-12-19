import { fal } from "@fal-ai/client";

// Ensure API Key exists
if (!process.env.FAL_KEY) {
  console.warn("⚠️ FAL_KEY is missing in .env. Image generation will be skipped.");
}

fal.config({
  credentials: process.env.FAL_KEY,
});

/**
 * 🎨 STYLE 1: MEME MASTERPIECE VARIANTS
 * Parodies of internet culture and crypto lore.
 */
const MEME_VARIANTS = [
  // Parody: "This is Fine"
  `Style: Webcomic parody, thick outlines, flat colors.
   Visuals: A Shiba Inu sitting calmly in a burning room full of "Bitcoin $1" signs, drinking coffee. 
   Mood: Absurd, Humorous, Resigned.`,

  // Parody: Wojak / Pink Bogal
  `Style: MS Paint style illustration, "Feels Good Man" aesthetic.
   Visuals: A green Pepe character with a giant brain or a crying pink Wojak character staring at a green candle price chart.
   Mood: Chaotic, Hyper-active, Internet-native.`,

  // Style: Surreal Corporate Memphis
  `Style: Absurd Corporate Memphis, flat vector art but with weird proportions.
   Visuals: A giant business suit with a Dogecoin for a head, walking a tiny moon on a leash like a dog.
   Mood: Quirky, Modern, Silly.`,

  // Style: GigaChad 3D
  `Style: Hyper-realistic 3D Unreal Engine 5.
   Visuals: A muscular, heroic Shiba Inu character wearing gold chains and diamond sunglasses, standing in front of a bank vault.
   Mood: Hype, Confident, Funny.`
];

/**
 * 🎨 STYLE 2: DYNAMIC EDITORIAL
 * High-end magazine styles for market and tech news.
 */
const EDITORIAL_VARIANTS = [
  // Style: Isometric Tech City
  `Style: Low-poly Isometric 3D Illustration.
   Visuals: A miniature digital city on a microchip, glowing paths of data, tiny trees, floating coins.
   Colors: Pastel Blues, Mint Green, and Soft Gold.`,

  // Style: The "Hand-Drawn" Digital
  `Style: Rough Hand-Drawn Digital Sketch, Copic marker texture.
   Visuals: An artistic sketch of a hand holding a glowing digital phone, loose ink lines, watercolor splashes.
   Mood: Human, Artistic, Modern.`,

  // Style: Glassmorphism
  `Style: Modern Glassmorphism, blurred background, translucent layers.
   Visuals: Floating frosted glass cards with 3D crypto logos, refraction effects, soft studio lighting.
   Mood: Premium, Clean, Tech-forward.`,

  // Style: Double Exposure Portrait
  `Style: Surreal Double Exposure Photography.
   Visuals: A silhouette of a visionary thinker merged with a chaotic digital code rain or a circuit board.
   Colors: Monochrome with one neon accent color.`,

  // Style: Paper-Cut Art
  `Style: Layered Paper-cut art, shadow depth.
   Visuals: 3D paper layers forming a mountain of coins or a digital landscape, clean edges, physical texture.
   Mood: Tangible, Unique, Crafty.`
];

/**
 * 🎨 STYLE 3: DRAMATIC SERIOUS
 * Gritty and symbolic styles for regulation, hacks, and crashes.
 */
const SERIOUS_VARIANTS = [
  // Style: Cyber-Security Glitch
  `Style: Raw Glitch Art, CRT monitor distortion.
   Visuals: A shattered digital shield, red "ERROR" warnings in the code, distorted static, hooded silhouette.
   Colors: Acid Green, Black, and Warning Red.`,

  // Style: Cinematic Noir
  `Style: Hyper-realistic Cinematic Noir, high contrast, film grain.
   Visuals: A close-up of a judge's gavel hitting a table, wood splinters flying, dramatic spotlight, thick shadows.
   Mood: Intense, Authoritative, Gritty.`,

  // Style: Minimalist Symbolism
  `Style: High-concept Minimalist Still Life.
   Visuals: A single golden coin trapped in a heavy iron birdcage, or a coin sinking into dark black water.
   Colors: Stark White, Pitch Black, and Deep Gold.`,

  // Style: Macro Photography
  `Style: Extreme Macro Photography, bokeh background.
   Visuals: Close-up of a circuit board with a tiny "leak" of digital liquid, or the eye of a person reflecting a red candlestick chart.
   Mood: Investigative, Tense, Micro-focused.`,

  // Style: The Blueprint
  `Style: Technical Blueprint, cyanotype aesthetic.
   Visuals: White wireframe lines of a broken chain-link on a deep blue background, handwritten technical notes.
   Mood: Structural, Analytical, Cold.`
]; 

const getRandomStyle = (variants) => variants[Math.floor(Math.random() * variants.length)];

export const generateImage = async (headline, category = "EDITORIAL") => {
  if (!process.env.FAL_KEY) return null;

  try {
    const cleanSubject = headline.replace(/[:"()]/g, "").trim();
    const lowerHead = cleanSubject.toLowerCase();

    // 1. Smart Category & Variant Selection
    let selectedVariant = getRandomStyle(EDITORIAL_VARIANTS); 
    let humorPrompt = "";

    // A. Detect MEME Context
    const memeTriggers = ['doge', 'pepe', 'shib', 'bonk', 'wif', 'meme', 'moon', 'rally', 'surge', 'pump', 'dump', 'hodl', 'whale'];
    if (memeTriggers.some(word => lowerHead.includes(word))) {
        selectedVariant = getRandomStyle(MEME_VARIANTS);
        category = "MEME";
        humorPrompt = "Add a specific humorous detail like a 'HODL' sign in the background or a character with an exaggerated bug-eyed expression of shock.";
    } 
    // B. Detect SERIOUS Context
    else if (
        lowerHead.includes('sec') || lowerHead.includes('sue') || 
        lowerHead.includes('ban') || lowerHead.includes('hack') || 
        lowerHead.includes('jail') || lowerHead.includes('law') || 
        lowerHead.includes('fraud') || lowerHead.includes('collapse')
    ) {
        selectedVariant = getRandomStyle(SERIOUS_VARIANTS);
        category = "SERIOUS";
        humorPrompt = "Ensure high-contrast dramatic lighting with a heavy cinematic noir atmosphere.";
    }

    console.log(`   🎨 Generating [${category}] Art for: "${cleanSubject.substring(0, 30)}..."`);

    // 2. Construct the Engineering Prompt
    const fullPrompt = `
      ${selectedVariant}
      
      SUBJECT: Create a conceptual image representing: "${cleanSubject}".
      CREATIVE DIRECTIVE: ${humorPrompt}
      
      SCENE RULES:
      - If "Bitcoin" is mentioned, show a glowing Orange Gold coin.
      - If "Ethereum" is mentioned, show a glowing Blue Crystal diamond.
      - If "Bull", show green arrows pointing up.
      - If "Bear", show red arrows pointing down.
      - NO TEXT: Do not attempt to render letters, names, or words.
      - QUALITY: 8k resolution, cinematic composition, masterpiece.
    `;

    // 3. Call Flux (Schnell)
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: fullPrompt,
        image_size: "landscape_16_9",
        num_inference_steps: 4, 
        seed: Math.floor(Math.random() * 1000000), 
        enable_safety_checker: false, 
        // ⚠️ GUIDANCE 2.0: Lower guidance allows more artistic creativity
        guidance_scale: 2.0, 
        sync_mode: true
      },
      logs: false, 
    });

    const images = result.images || (result.data && result.data.images);
    return images && images.length > 0 ? images[0].url : null;

  } catch (error) {
    console.error("   ❌ Image Gen Error:", error.message);
    return null; 
  }
};