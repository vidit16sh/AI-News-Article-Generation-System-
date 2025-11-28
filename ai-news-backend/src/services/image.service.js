import { fal } from "@fal-ai/client";

// Configure Fal.ai
fal.config({
  credentials: process.env.FAL_KEY,
});

const generateImage = async (headline) => {
  try {
    console.log(`   🎨 Generating Fal.ai Image for: "${headline.substring(0, 20)}..."`);

    // Using Flux Schnell (Fast & Cheap)
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: `Editorial news illustration, crypto cryptocurrency theme, modern digital art, highly detailed, ${headline}`,
        image_size: "landscape_16_9",
        num_inference_steps: 4,
        seed: Math.floor(Math.random() * 1000000),
        enable_safety_checker: true
      },
      logs: false, // Keep logs clean
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