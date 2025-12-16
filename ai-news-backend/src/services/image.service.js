import { fal } from "@fal-ai/client";

// Ensure API Key exists
if (!process.env.FAL_KEY) {
  console.warn("⚠️ FAL_KEY is missing in .env. Image generation will be skipped.");
}

fal.config({
  credentials: process.env.FAL_KEY,
});

// 📸 STYLE 1: SERIOUS (Bloomberg / Reuters Style)
// Best for: Regulation, Lawsuits, Hacks, Government news
const REALISM_PROMPT = `
Style: Award-winning Photojournalism, Cinematic Editorial Photography.
Visuals: Highly detailed, hyper-realistic, dramatic lighting (volumetric fog, studio rim lighting), depth of field (bokeh).
Camera: Shot on Sony A7R IV, 35mm lens, f/1.8 aperture.
Texture: 8k resolution, ray tracing, sharp focus, incredibly detailed textures.
Mood: Serious, trustworthy, impactful, "Breaking News" aesthetic.
Composition: Rule of thirds, centered subject, professional color grading (cool corporate tones or dramatic warm tones).
`;

// 🎨 STYLE 2: CRYPTO-POP (The Block / CoinDesk Feature Style)
// Best for: Price Actions, NFT drops, Community sentiment, Op-Ed
const CRYPTO_POP_PROMPT = `
Style: High-End 3D Editorial Illustration, Digital Art (Beeple meets Pixar).
Visuals: Octane Render, Unreal Engine 5, isometric or abstract 3D composition.
Materials: Glass, chrome, brushed gold, matte plastic, glowing neon accents.
Colors: Vibrant, cyberpunk, vaporwave, rich gradients (purple/blue/teal).
Mood: Futuristic, chaotic-good, energetic, "Web3 Culture".
Composition: Abstract representations of the subject (e.g., a glass bull running through a digital city), clean lines.
`;

export const generateImage = async (headline, style = "REALISM") => {
  if (!process.env.FAL_KEY) return null;

  try {
    console.log(`   🎨 Generating [${style}] Art for: "${headline.substring(0, 30)}..."`);

    // 1. Clean the headline to remove confusing chars, but KEEP $ and %
    const cleanSubject = headline
      .replace(/[:"()]/g, "") // Remove quotes/colons
      .trim();

    // 2. Select Prompt Base
    const basePrompt = style === "POP" ? CRYPTO_POP_PROMPT : REALISM_PROMPT;

    // 3. Construct the Engineering Prompt
    const fullPrompt = `
    ${basePrompt}
    
    SUBJECT DIRECTIVE: Create a visual representation of: "${cleanSubject}".
    
    SCENE RULES:
    - If the headline mentions a specific coin (e.g., Bitcoin, Ethereum), incorporate its logo or a symbolic representation (e.g., a gold coin with 'B').
    - If the headline is about a "Hack" or "Crash", use red tones, shattered glass, or dark moody lighting.
    - If the headline is about a "Rally" or "Bull Run", use green tones, upward arrows, or ascending geometry.
    - NO TEXT: Do not attempt to write words or the headline inside the image.
    `;

    // 4. Call Flux (Schnell is fast/cheap, Dev is higher quality. Schnell is fine for news if prompted well)
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: fullPrompt,
        image_size: "landscape_16_9",
        num_inference_steps: 4, // 4 is standard for Schnell
        seed: Math.floor(Math.random() * 1000000), // Randomize seed to avoid identical images for similar news
        enable_safety_checker: true, // Keep false for news (avoids false positives on "wars" or "attacks")
        guidance_scale: 7.5,
        sync_mode: true
      },
      logs: false, 
    });

    // 5. Extract URL safely
    const images = result.images || (result.data && result.data.images);

    if (images && images.length > 0) {
      // ✅ SUCCESS: Return the URL. 
      // The 'generate.worker.js' will take this URL and pass it to 'storage.service.js' to save locally.
      return images[0].url;
    }
    
    console.warn("   ⚠️ Fal.ai returned no images.");
    return null;

  } catch (error) {
    console.error("   ❌ Image Gen Error:", error.message);
    return null; 
  }
};