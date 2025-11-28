import { fal } from "@fal-ai/client";

// Configure the client to use your key from env
fal.config({
  credentials: process.env.FAL_KEY,
});

const generateImage = async (headline) => {
  try {
    console.log(`   🎨 Generating Fal.ai Image for: "${headline.substring(0, 20)}..."`);

    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: `Editorial news illustration, crypto themed, highly detailed, ${headline}`,
        image_size: "landscape_16_9",
        num_inference_steps: 4, // Low steps = fast generation
        seed: Math.floor(Math.random() * 1000000),
        enable_safety_checker: true
      },
      logs: true,
    });

    // Fal returns a list of images. We take the first one.
    if (result.images && result.images.length > 0) {
      return result.images[0].url;
    }

    return null;

  } catch (error) {
    console.error("❌ Fal.ai Error:", error.message);
    return null; // Fallback to null (frontend handles missing image)
  }
};

export { generateImage };