import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

function parseResponseText(response) {
  if (typeof response?.text === 'string' && response.text.trim()) {
    return response.text;
  }

  const parts = response?.candidates?.flatMap((candidate) => candidate?.content?.parts ?? []) ?? [];
  const text = parts
    .map((part) => part?.text)
    .filter(Boolean)
    .join('');

  return text || '';
}

export function stripCodeFence(text) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

export async function callGeminiJson(
  prompt,
  { model = env.GEMINI_MODEL, timeoutMs = 45000, responseJsonSchema } = {},
) {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.6,
      maxOutputTokens: 7000,
      responseMimeType: 'application/json',
      ...(responseJsonSchema ? { responseJsonSchema } : {}),
      timeout: timeoutMs,
    },
  });

  const text = parseResponseText(response);
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return stripCodeFence(text);
}
