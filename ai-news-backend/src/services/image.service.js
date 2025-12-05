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
  // 🔍 DEBUGGING
  if (!process.env.FAL_KEY) {
      console.error("❌ FATAL: FAL_KEY is missing in .env!");
      return null;
  }

  try {
    console.log(`   🎨 Generating Professional Image for: "${headline.substring(0, 20)}..."`);

    const cleanSubject = headline
        .replace(/(\$\d+[\d,.]*)|(\d+%)/g, "") 
        .replace(/[:\-]/g, " ") 
        .trim();

    const fullPrompt = `
    ${THEME_PROMPT}
    Subject: A conceptual representation of: "${cleanSubject}".
    Context: Cryptocurrency, Blockchain technology, Global Finance.
    Details: 8k resolution, unreal engine 5 render, hyper-detailed, trending on artstation.
    `;

    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: fullPrompt,
        image_size: "landscape_16_9",
        num_inference_steps: 4,
        seed: Math.floor(Math.random() * 1000000),
        enable_safety_checker: true,
        guidance_scale: 7.5
      },
      logs: true, 
    });

    // ✅ FIX: Check BOTH possible locations for images
    // Some models return { images: [] }, others return { data: { images: [] } }
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