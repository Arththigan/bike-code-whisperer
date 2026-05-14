import { GoogleGenerativeAI } from "@google/generative-ai";

async function test() {
  const apiKey = "AIzaSyBKQjTZhQxsuMKqWIfz5qxTEBRqE6beT6o";
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels();
    console.log("Available models:", models);
  } catch (err) {
    // If listModels is not directly on model
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log("Models list from API:", JSON.stringify(data, null, 2));
    } catch (fetchErr) {
        console.error("Failed to list models:", fetchErr.message);
    }
  }
}

test();
