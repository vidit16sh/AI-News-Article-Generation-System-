import { fal } from "@fal-ai/client";

// Configure Fal.ai
fal.config({
  credentials: process.env.FAL_KEY,
});

// New "Photorealistic News" Style Guide
const REALISM_PROMPT = `
Style: Cinematic Editorial Photography, Award-Winning Photojournalism.
Quality: 8k resolution, hyper-realistic, highly detailed textures, sharp focus.
Lighting: Dramatic studio lighting or natural cinematic lighting (volumetric fog, golden hour, or moody cyber-noir depending on context).
Camera: Shot on 35mm lens, f/1.8 aperture for depth of field.
Vibe: Impactful, serious, trustworthy, breaking news, eye-catching.
Constraints: No text overlays, no watermarks, no cartoonish or 3D render styles.
`;

const generateImage = async (headline) => {
  // 🔍 DEBUGGING
  if (!process.env.FAL_KEY) {
      console.error("❌ FATAL: FAL_KEY is missing in .env!");
      return null;
  }

  try {
    console.log(`   🎨 Generating Realistic Image for: "${headline.substring(0, 20)}..."`);

    // 1. Light cleaning: Remove only structural characters that confuse prompts, 
    // BUT keep the $$$ and % signs as they add context (e.g., "$1B Hack" is different from "Hack")
    const cleanSubject = headline
        .replace(/[:\-]/g, " ") // Remove colons/hyphens
        .replace(/\s+/g, " ")   // Fix double spaces
        .trim();

    // 2. Construct a prompt focused on visual storytelling
    const fullPrompt = `
    ${REALISM_PROMPT}
    Subject: A compelling, photorealistic scene representing the news story: "${cleanSubject}".
    Context: Make it look like a high-budget header image for a top-tier financial news site (Bloomberg, Reuters, The Verge).
    Focus: Capture the essence of the headline visually. If it's about crypto, show realistic physical coins or high-tech server farms. If politics, show a dramatic meeting or capitol building. If tech, show futuristic hardware.
    `;

    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: fullPrompt,
        image_size: "landscape_16_9",
        num_inference_steps: 4, // Flux Schnell is fast, 4 is usually enough
        seed: Math.floor(Math.random() * 1000000),
        enable_safety_checker: true,
        guidance_scale: 7.5
      },
      logs: true, 
    });

    // ✅ Check BOTH possible locations for images
    const images = result.images || (result.data && result.data.images);

    if (images && images.length > 0) {
      return images[0].url;
    }
    
    console.error("❌ Fal.ai returned no images. Raw Response:", JSON.stringify(result));
    return null;

  } catch (error) {
    console.error("❌ Fal.ai Exception:", error.message);
    return null; 
  }
};

export { generateImage };