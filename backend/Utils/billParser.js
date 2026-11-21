import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Instantiate the modern unified GenAI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const BILL_PARSE_SCHEMA = {
  type: 'object',
  properties: {
    totalBilledAmount: {
      type: 'number',
      description: 'The total amount billed on the medical bill in USD.',
    },
    detectedCptCodes: {
      type: 'array',
      description: 'All CPT/HCPCS procedure codes detected on the bill.',
      items: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The CPT or HCPCS procedure code (e.g. 99213).',
          },
          description: {
            type: 'string',
            description: 'Human-readable description of the procedure or service.',
          },
          charge: {
            type: 'number',
            description: 'The dollar amount charged for this line item.',
          },
        },
        required: ['code', 'description', 'charge'],
      },
    },
  },
  required: ['totalBilledAmount', 'detectedCptCodes'],
};

/**
 * Sends plain medical bill text to Gemini and returns structured billing data.
 */
export async function parseBillText(rawText) {
  try {
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return {
        totalBilledAmount: 0,
        detectedCptCodes: [],
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are a medical billing data extraction specialist. Parse the following medical bill text and extract structured billing information. Identify all CPT/HCPCS procedure codes along with their descriptions and individual charges. Determine the total billed amount (grand total). If a value cannot be found, use 0 for totalBilledAmount and an empty array for detectedCptCodes.

--- MEDICAL BILL TEXT ---
${rawText}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: BILL_PARSE_SCHEMA,
      },
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error('Gemini returned an empty response when parsing bill text.');
    }

    const parsed = JSON.parse(rawJson);

    return {
      totalBilledAmount: Number(parsed.totalBilledAmount) || 0,
      detectedCptCodes: Array.isArray(parsed.detectedCptCodes)
        ? parsed.detectedCptCodes.map((item) => ({
            code: String(item.code ?? ''),
            description: String(item.description ?? ''),
            charge: Number(item.charge) || 0,
          }))
        : [],
    };
  } catch (error) {
    console.error('❌ Gemini Bill Parsing Failure:', error);
    throw error;
  }
}
