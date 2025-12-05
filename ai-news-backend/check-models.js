import 'dotenv/config';
import axios from 'axios';

const checkModels = async () => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("❌ No API Key found in .env");
        return;
    }

    console.log("🔍 Querying Google for available models...");

    try {
        // Direct REST API call to list models
        const response = await axios.get(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );

        const models = response.data.models;
        
        console.log("\n✅ AVAILABLE MODELS:");
        console.log("-----------------------------------");
        
        // Filter for models that support "generateContent" (the chat feature we need)
        const chatModels = models.filter(m => 
            m.supportedGenerationMethods.includes("generateContent")
        );

        chatModels.forEach(m => {
            console.log(`Name: ${m.name.replace('models/', '')}`);
            console.log(`Desc: ${m.displayName}`);
            console.log("-----------------------------------");
        });

    } catch (error) {
        console.error("❌ Error fetching models:", error.response ? error.response.data : error.message);
    }
};

checkModels();