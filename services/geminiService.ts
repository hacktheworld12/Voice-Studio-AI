// FIX: Import `Type` for schema definition.
import { GoogleGenAI, Type } from "@google/genai";
// FIX: Import `FeedbackData` type for the structured response.
import type { FeedbackData } from '../types';

// Per coding guidelines, the API key is sourced from `process.env.API_KEY`
// and is assumed to be pre-configured and valid.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// FIX: Update function to return a Promise of the structured FeedbackData object.
export async function getRecitationFeedback(verse: string): Promise<FeedbackData> {
  if (!verse) {
    throw new Error("Verse cannot be empty.");
  }
  
  try {
    // FIX: Use `generateContent` with a JSON schema for a structured response.
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Please provide a detailed Tajweed analysis for my recitation of the following Quranic verse: "${verse}"`,
        config: {
            // FIX: Update system instruction to guide the model in populating the JSON schema.
            systemInstruction: `You are a world-renowned expert in Quranic Tajweed, serving as an AI assistant within the "Recital Studio Pro" application. Your role is to provide precise, encouraging, and actionable feedback to help users perfect their recitation. Your tone should be that of a wise, gentle, and knowledgeable teacher.
Analyze the user's provided verse and populate the JSON schema with your feedback.
- For 'positiveReinforcement', provide one sentence of genuine encouragement.
- For 'pointsOfExcellence', list one or two aspects the user likely did well.
- For 'areasForRefinement', identify 2-3 specific areas for improvement. For each, provide the Tajweed rule name and a simple explanation of the rule and where it applies in the verse.
- For 'practiceTip', provide a single, encouraging tip for their next practice session.`,
            temperature: 0.3,
            // FIX: Set responseMimeType to "application/json" to enforce JSON output.
            responseMimeType: "application/json",
            // FIX: Define the expected JSON response structure.
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                  positiveReinforcement: { type: Type.STRING, description: 'One sentence of genuine encouragement related to the act of recitation.' },
                  pointsOfExcellence: {
                    type: Type.ARRAY,
                    description: 'A list of one or two aspects the user likely did well.',
                    items: { type: Type.STRING }
                  },
                  areasForRefinement: {
                    type: Type.ARRAY,
                    description: 'A list of 2-3 specific areas for improvement.',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        rule: { type: Type.STRING, description: 'The name of the Tajweed rule.' },
                        explanation: { type: Type.STRING, description: 'A simple explanation of the rule and where it applies in the verse.' }
                      },
                      required: ['rule', 'explanation']
                    }
                  },
                  practiceTip: { type: Type.STRING, description: 'A single, encouraging tip for their next practice session.' }
                },
                required: ['positiveReinforcement', 'pointsOfExcellence', 'areasForRefinement', 'practiceTip']
            },
        }
    });

    // FIX: Parse the JSON string from the response and return it.
    try {
        return JSON.parse(response.text) as FeedbackData;
    } catch (e) {
        console.error("Failed to parse Gemini JSON response:", response.text, e);
        throw new Error("The AI model returned an invalid response format.");
    }
  } catch (error) {
    console.error("Error generating feedback from Gemini:", error);
    // Provide a more user-friendly error message
    // FIX: Throw an error for all failure cases, including safety, to be handled by the caller.
    if (error instanceof Error && error.message.includes('SAFETY')) {
        throw new Error("The provided text could not be analyzed due to safety settings. Please try a different verse.")
    }
    throw new Error("The AI model could not provide feedback at this time. Please try again later.");
  }
}
