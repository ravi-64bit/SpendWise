require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function generateResponse(prompt) {
    try {
        const response = await ai.interactions.create({
            model: 'gemini-3.8-flash',
            input: prompt,
        });

        return response.output_text.joke || {'err':'jokes on you'};
    } catch (error) {
        console.error('Error generating response:', error);
    }
}

async function main() {
    const response = await generateResponse(
        "strictly respond with JSON only with a key 'joke' and any joke you wanna tell me."
    );
    console.log(JSON.parse(response));
}


main();
