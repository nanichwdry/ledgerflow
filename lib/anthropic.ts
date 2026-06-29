import { IS_MOCK_MODE } from '@/lib/env';

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

Respond with a JSON object matching this schema:
{"vendorName": string|null, "date": string|null, "totalCents": number|null, "lineItems": [{"description": string, "amountCents": number}]}`;

export async function extractReceiptData(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<ExtractedReceipt> {
  const apiKey = process.env.GEMINI_API_KEY;
  const isMock = IS_MOCK_MODE || !apiKey || apiKey === 'your-gemini-api-key';

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mediaType,
                data: imageBase64,
              },
            },
            {
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const responseJson = await response.json();
  const text = responseJson?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API did not return text content.');
  }

  try {
    return JSON.parse(text) as ExtractedReceipt;
  } catch {
    throw new Error(`Could not parse Gemini response as JSON: ${text.slice(0, 200)}`);
  }
}
