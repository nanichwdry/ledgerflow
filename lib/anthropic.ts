import Anthropic from '@anthropic-ai/sdk';
import { IS_MOCK_MODE } from '@/lib/env';

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey && apiKey !== 'your-anthropic-api-key' ? new Anthropic({ apiKey }) : null;

export type ExtractedReceipt = {
  vendorName: string | null;
  date: string | null; // ISO date, e.g. "2026-06-14"
  totalCents: number | null;
  lineItems: { description: string; amountCents: number }[];
};


const EXTRACTION_PROMPT = `You are reading a photographed business receipt. Extract:
- vendorName: the merchant/business name
- date: the transaction date in YYYY-MM-DD format (use your best reading; if no date is visible, use null)
- totalCents: the final total amount paid, in integer cents
- lineItems: an array of { description, amountCents } for each line item you can read (best effort — an empty array is fine if the receipt is a single lump total)

Respond with ONLY a raw JSON object matching this shape, no markdown fences, no commentary:
{"vendorName": string|null, "date": string|null, "totalCents": number|null, "lineItems": [{"description": string, "amountCents": number}]}`;

export async function extractReceiptData(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<ExtractedReceipt> {
  const isMock = IS_MOCK_MODE || !client;
  if (isMock) {
    return {
      vendorName: 'Mock Coffee Company',
      date: new Date().toISOString().split('T')[0],
      totalCents: 1550,
      lineItems: [
        { description: 'Cold Brew Coffee', amountCents: 650 },
        { description: 'Avocado Sourdough Toast', amountCents: 900 }
      ]
    };
  }

  const response = await client!.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude did not return a text response for receipt extraction.');
  }

  const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned) as ExtractedReceipt;
  } catch {
    throw new Error(`Could not parse receipt extraction as JSON: ${cleaned.slice(0, 200)}`);
  }
}
