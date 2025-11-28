import { fal } from "@fal-ai/client";

// Configure Fal.ai
fal.config({
  credentials: process.env.FAL_KEY,
});

const THEME_PROMPT = `
Style: High-end editorial 3D illustration, isometric view.
Materials: Frosted glass, matte ceramic, polished gold accents.
Lighting: Soft studio lighting, volumetric fog, cinematic depth of field.
Colors: Indigo, Electric Blue, White, Gold.
Vibe: Trustworthy, futuristic, financial technology, minimal.
composition: Central subject, clean background, no text, no watermarks.
`;

const generateImage = async (headline) => {
  try {
    console.log(`   🎨 Generating Professional Image for: "${headline.substring(0, 20)}..."`);

    // 1. Clean the headline to remove "noise" (dates, tickers) for better visual concepts
    const cleanSubject = headline
        .replace(/(\$\d+[\d,.]*)|(\d+%)/g, "") // Remove specific prices/percentages ($50k, 5%)
        .replace(/[:\-]/g, " ") // Remove colons/dashes
        .trim();

    // 2. Construct the Professional Prompt
    const fullPrompt = `
    ${THEME_PROMPT}
    
    Subject: A conceptual representation of: "${cleanSubject}".
    Context: Cryptocurrency, Blockchain technology, Global Finance.
    
    Details: 8k resolution, unreal engine 5 render, hyper-detailed, trending on artstation.
    `;

    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: fullPrompt,
        image_size: "landscape_16_9", // Perfect for Article Headers
        num_inference_steps: 6,       // Increased slightly for better detail (4 -> 6)
        seed: Math.floor(Math.random() * 1000000),
        enable_safety_checker: true,
        guidance_scale: 7.5           // Forces model to follow the "Theme" strictly
      },
      logs: false,
    });

    if (result.images && result.images.length > 0) {
      return result.images[0].url;
    }
    return null;

  } catch (error) {
    console.error("❌ Fal.ai Error:", error.message);
    return null; 
  }
};

export { generateImage };