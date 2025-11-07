
import { GoogleGenAI, Type } from "@google/genai";
import { FrameData, OcrResult, SubtitleEvent } from '../types';

const FRAME_DURATION = 0.5; // Corresponds to 1/FRAME_CAPTURE_RATE from videoHelper

let ai: GoogleGenAI | null = null;
const getAi = () => {
  if (!ai) {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
}


const ocrSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      text: {
        type: Type.STRING,
        description: 'The recognized text content.',
      },
      boundingBox: {
        type: Type.OBJECT,
        properties: {
          x: { type: Type.NUMBER },
          y: { type: Type.NUMBER },
          width: { type: Type.NUMBER },
          height: { type: Type.NUMBER },
        },
        required: ['x', 'y', 'width', 'height'],
      },
    },
    required: ['text', 'boundingBox'],
  },
};

export const extractTextFromFrames = async (
  frames: FrameData[],
  onProgress: (progress: number) => void
): Promise<SubtitleEvent[]> => {
  const gemini = getAi();
  const subtitleEvents: SubtitleEvent[] = [];
  
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    
    try {
      const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: frame.imageData,
              },
            },
            {
              text: "You are an expert OCR system. Analyze the image to find all text blocks. Provide the text and bounding box for each. Respond ONLY with a JSON object matching the provided schema. If no text is found, return an empty array.",
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: ocrSchema,
        },
      });

      const ocrResults = JSON.parse(response.text) as OcrResult[];

      for (const result of ocrResults) {
        subtitleEvents.push({
          start: frame.time,
          end: frame.time + FRAME_DURATION,
          text: result.text,
          x: result.boundingBox.x + result.boundingBox.width / 2,
          y: result.boundingBox.y + result.boundingBox.height / 2,
        });
      }
    } catch (error) {
        console.error(`Error processing frame ${i}:`, error);
        // Continue to next frame
    }
    onProgress((i + 1) / frames.length);
  }

  return subtitleEvents;
};

export const translateTexts = async (
  texts: string[]
): Promise<Map<string, string>> => {
  if (texts.length === 0) {
    return new Map();
  }
  
  const gemini = getAi();
  const uniqueTexts = [...new Set(texts)];
  
  const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Translate the following text snippets to Vietnamese. Provide the translation for each snippet on a new line, in the same order. Do not add any extra formatting or numbering.

TEXTS TO TRANSLATE:
---
${uniqueTexts.join('\n---\n')}
---
`
  });

  const translations = response.text.split('\n---\n').map(t => t.trim());
  const translationMap = new Map<string, string>();

  if (translations.length === uniqueTexts.length) {
      for (let i = 0; i < uniqueTexts.length; i++) {
          translationMap.set(uniqueTexts[i], translations[i]);
      }
  } else {
      console.error("Mismatch between original texts and translations count.");
      // Fallback to original text if translation fails
      for(const text of uniqueTexts) {
          translationMap.set(text, text);
      }
  }

  return translationMap;
};
   