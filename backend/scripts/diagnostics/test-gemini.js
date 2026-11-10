import { GoogleGenerativeAI } from "@google/generative-ai";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const testGemini = async () => {
  try {
    const key = process.env.GEMINI_API_KEY;
    console.log("Key starting with:", key.substring(0, 6));
    
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + key);
    const data = await response.json();
    console.log("Models:", data.models.map(m => m.name));
  } catch (error) {
    console.error("Error from Gemini:", error.message);
  }
};

testGemini();
