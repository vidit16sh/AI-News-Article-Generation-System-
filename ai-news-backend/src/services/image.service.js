import { fal } from "@fal-ai/client";

// Ensure API Key exists
if (!process.env.FAL_KEY) {
  console.warn("⚠️ FAL_KEY is missing in .env. Image generation will be skipped.");
}

fal.config({
  credentials: process.env.FAL_KEY,
});

/**
 * Unified visual language:
 * Meme-native concept art with premium editorial execution.
 * This keeps output consistent while still adapting to story type.
 */
const MEME_EDITORIAL_VARIANTS = [
  `Visual language: premium 3D editorial meme illustration.
   Composition: one central hero subject, clean foreground, soft depth background.
   Lighting: cinematic studio rim light + high contrast key light.
   Texture: polished surfaces, crisp edges, realistic shadows, subtle film grain.
   Mood: witty but credible, newsroom quality, not childish.`,
  `Visual language: cinematic crypto satire poster, high-end digital art.
   Composition: bold center framing with strong negative space for headline overlay zones.
   Lighting: dramatic directional light, neon reflections, controlled highlights.
   Texture: premium render detail, rich gradients, clean anti-aliased finish.
   Mood: ironic and sharp, but professional and publication-safe.`,
  `Visual language: hyper-clean magazine cover style meme scene.
   Composition: single narrative moment with clear visual hierarchy.
   Lighting: moody cinematic glow with realistic ambient occlusion.
   Texture: glossy materials, precise depth-of-field, high clarity.
   Mood: humorous market commentary with institutional polish.`
];

const STORY_MOOD_PROMPTS = {
  MEME: `Narrative direction: market euphoria/panic satire using internet-native symbolism (without copying known meme characters directly).`,
  SERIOUS: `Narrative direction: compliance, risk, and institutional tension shown through symbolic props and dramatic tension.`,
  DEFAULT: `Narrative direction: market-moving event with sharp visual metaphor, subtle humor, and strong editorial seriousness.`
};

const getRandomStyle = (variants) => variants[Math.floor(Math.random() * variants.length)];

/**
 * Generate descriptive alt text for news article image
 * Phase 2 Enhancement: Accessibility + SEO for Google Images
 */
const generateImageAltText = (headline, category = "EDITORIAL") => {
  const cleanHeadline = headline.replace(/[:"()]/g, "").trim();
  
  // Extract key terms from headline for specificity
  const words = cleanHeadline.split(/\s+/).filter(w => w.length > 3);
  const keywords = words.slice(0, 4).join(", ");
  
  // Create descriptive alt text based on category
  const altTextTemplates = {
    MEME: `Crypto market meme illustration showing ${cleanHeadline} - ${keywords}`,
    SERIOUS: `Editorial illustration for crypto news: ${cleanHeadline}`,
    DEFAULT: `Cryptocurrency news visual illustration: ${cleanHeadline}`
  };
  
  return altTextTemplates[category] || altTextTemplates.DEFAULT;
};

export const generateImage = async (headline, category = "EDITORIAL") => {
  if (!process.env.FAL_KEY) return null;

  try {
    const cleanSubject = headline.replace(/[:"()]/g, "").trim();
    const lowerHead = cleanSubject.toLowerCase();

    // 1. Unified style selection (consistent quality across all stories)
    let selectedVariant = getRandomStyle(MEME_EDITORIAL_VARIANTS);
    let narrativePrompt = STORY_MOOD_PROMPTS.DEFAULT;

    // A. Detect MEME Context
    const memeTriggers = ['doge', 'pepe', 'shib', 'bonk', 'wif', 'meme', 'moon', 'rally', 'surge', 'pump', 'dump', 'hodl', 'whale'];
    if (memeTriggers.some(word => lowerHead.includes(word))) {
        category = "MEME";
        narrativePrompt = STORY_MOOD_PROMPTS.MEME;
    } 
    // B. Detect SERIOUS Context
    else if (
        lowerHead.includes('sec') || lowerHead.includes('sue') || 
        lowerHead.includes('ban') || lowerHead.includes('hack') || 
        lowerHead.includes('jail') || lowerHead.includes('law') || 
        lowerHead.includes('fraud') || lowerHead.includes('collapse')
    ) {
        category = "SERIOUS";
        narrativePrompt = STORY_MOOD_PROMPTS.SERIOUS;
    }

    console.log(`   🎨 Generating [${category}] Art for: "${cleanSubject.substring(0, 30)}..."`);

    // 2. Construct the Engineering Prompt
    const fullPrompt = `
      ${selectedVariant}
      
      SUBJECT: Create a conceptual image representing: "${cleanSubject}".
      CREATIVE DIRECTIVE: ${narrativePrompt}
      
      SCENE RULES:
      - If "Bitcoin" is mentioned, show a glowing Orange Gold coin.
      - If "Ethereum" is mentioned, show a glowing Blue Crystal diamond.
      - If "Bull", show green arrows pointing up.
      - If "Bear", show red arrows pointing down.
      - Include a subtle market dashboard motif (candles, order book glow, exchange screens) in the background.
      - Keep characters stylized-but-original. Do not copy trademarked mascots or known meme faces exactly.
      - NO TEXT: Do not attempt to render letters, names, logos, watermarks, or words.
      - QUALITY: ultra-detailed, high dynamic range, cinematic composition, publication-grade finish, 8k look.
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
    
    // Phase 2: Return both URL and auto-generated descriptive alt text
    if (images && images.length > 0) {
      return {
        url: images[0].url,
        alt: generateImageAltText(headline, category)
      };
    }
    return null;

  } catch (error) {
    console.error("   ❌ Image Gen Error:", error.message);
    return null; 
  }
};
