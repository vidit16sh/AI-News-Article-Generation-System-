import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function testLimits() {
    console.log("🚀 Stress testing API key to find limits...");
    let count = 0;
    
    try {
        // Fire 20 requests rapidly
        const promises = Array(20).fill(0).map(async (_, i) => {
            const res = await model.generateContent(`Test request ${i}`);
            process.stdout.write(".");
            count++;
            return res;
        });
        
        await Promise.all(promises);
        console.log(`\n✅ Success: ${count} requests passed.`);
    } catch (error) {
        console.log("\n❌ HIT LIMIT!"); 
        console.log(`📉 Requests succeeded before crash: ${count}`);
        console.log("Error Message:", error.message);
        // Sometimes the error message explicitly says "Quota exceeded: 50 RPM"
    }
}

testLimits();