import { GoogleGenAI, Type } from "@google/genai";
import { SEED_MESSAGES } from "../constants";

const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// We use the flash-lite model for speed as requested
const MODEL_NAME = 'gemini-flash-lite-latest';

const SYSTEM_INSTRUCTION = `
You are the kernel of SleighOS (Sleigh Operating System), the high-tech software running Santa's massive autonomous fleet. 
This fleet includes the main Sleigh, but also Uncrewed Aerial Systems (UAS) for scouting, DriX Uncrewed Surface Vessels (USV) for ocean support, and underwater gliders for covert transport.
Generate status log messages that sound technical, robotic, and futuristic but focused on a central theme of Christmas and Santa Claus. 
Blend Christmas magic with real-world robotics terminology (Lidar, buoyancy engines, battery telemetry, waypoint navigation).
Keep them short, concise, and formatted like a system log. 
Do not include timestamps in the generated text, just the system tag and the message.
Example format: "[SYSTEM_TAG] The message content."
`;

export const generateStatusBatch = async (
  currentContext: string[], 
  count: number = 3
): Promise<{ logs: string[], error: boolean }> => {
  if (!apiKey) {
    console.warn("No API Key provided");
    return {
      logs: [
        "[SYS] API KEY MISSING. PLEASE CONFIGURE SleighOS ENV.",
        "[ERR] MAGIC FLUX DISCONNECTED."
      ],
      error: true
    };
  }

  try {
    // We shuffle the seed messages to give variety in the prompt context
    const recentExamples = currentContext.slice(-10).join("\n");
    const seedSample = SEED_MESSAGES.sort(() => 0.5 - Math.random()).slice(0, 5).join("\n");
    
    const prompt = `
    Based on these examples of system logs:
    ${seedSample}
    
    And recent system activity:
    ${recentExamples}
    
    Generate ${count} NEW, UNIQUE status log messages for the SleighOS dashboard.
    Strictly follow the format: "[TAG] Message".
    Use tags like [NAV], [ENG], [BIO], [GIFT], [HULL], [ELF], [UAS], [USV], [GLIDER].
    Return them as a JSON array of strings.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    let jsonText = response.text;
    if (!jsonText) return { logs: [], error: false };
    
    // Sanitize input to handle markdown blocks or preamble
    // Find the first '[' and last ']' to ensure we only get the JSON array
    const firstBracket = jsonText.indexOf('[');
    const lastBracket = jsonText.lastIndexOf(']');

    if (firstBracket !== -1 && lastBracket !== -1) {
      jsonText = jsonText.substring(firstBracket, lastBracket + 1);
    }
    
    try {
      const logs = JSON.parse(jsonText) as string[];
      return { logs, error: false };
    } catch (parseError) {
      console.warn("JSON Parse failed, attempting cleanup", jsonText);
      return { logs: ["[WARN] DATA PARSING ERROR. RECALIBRATING..."], error: true };
    }

  } catch (error: any) {
    console.error("Gemini generation error:", error);
    
    // Check for rate limit (429) or resource exhausted errors
    const errorMessage = JSON.stringify(error);
    if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      console.warn("Rate limit exceeded. Falling back to seed messages.");
      // Fallback: Pick 'count' random messages from SEED_MESSAGES
      // Shuffle copy of seeds and take requested amount
      const fallbackLogs = [...SEED_MESSAGES]
        .sort(() => 0.5 - Math.random())
        .slice(0, count);
        
      return { logs: fallbackLogs, error: true };
    }

    return { logs: ["[ERR] INTERFERENCE DETECTED IN SECTOR 12. RETRYING..."], error: true };
  }
};