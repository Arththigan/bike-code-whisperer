import { GoogleGenerativeAI } from "@google/generative-ai";

async function test() {
  const apiKey = "AIzaSyBKQjTZhQxsuMKqWIfz5qxTEBRqE6beT6o";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  try {
    const result = await model.generateContent("Say hello");
    const response = await result.response;
    console.log("Success:", response.text());
  } catch (err) {
    console.error("Failed:", err.message);
  }
}

test();
