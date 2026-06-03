const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
const key = env.split('\n').find(line => line.startsWith('VITE_GEMINI_API_KEY=')).split('=')[1].trim();
const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: 'application/json' }});
model.generateContent('Reply with JSON { "success": true }')
  .then(res => console.log('Success:', res.response.text()))
  .catch(err => console.error('Error:', err.message));
