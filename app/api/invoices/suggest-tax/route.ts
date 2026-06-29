import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateOrganization } from '@/lib/supabase/server';
import { IS_MOCK_MODE } from '@/lib/env';

export async function GET(req: Request) {
  const org = await getOrCreateOrganization();
  if (!org) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('customerId');
  if (!customerId) {
    return NextResponse.json({ error: 'Missing customerId' }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: org.id },
  });

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const locationText = [customer.address, customer.region].filter(Boolean).join(', ');
  const apiKey = process.env.GEMINI_API_KEY;
  const isMock = IS_MOCK_MODE || !apiKey || apiKey === 'your-gemini-api-key';

  // Rule-based fallback mapping (always works offline/mock mode)
  const localSuggest = () => {
    const text = locationText.toLowerCase();
    if (text.includes('ca') || text.includes('california')) {
      return { ratePercent: 7.25, rateName: 'California Sales Tax' };
    }
    if (text.includes('ny') || text.includes('new york')) {
      return { ratePercent: 4.0, rateName: 'New York Sales Tax' };
    }
    if (text.includes('tx') || text.includes('texas')) {
      return { ratePercent: 6.25, rateName: 'Texas Sales Tax' };
    }
    if (text.includes('fl') || text.includes('florida')) {
      return { ratePercent: 6.0, rateName: 'Florida Sales Tax' };
    }
    if (text.includes('wa') || text.includes('washington')) {
      return { ratePercent: 6.5, rateName: 'Washington Sales Tax' };
    }
    return { ratePercent: 0, rateName: 'No Sales Tax suggested' };
  };

  if (isMock) {
    return NextResponse.json(localSuggest());
  }

  try {
    const prompt = `You are a B2B sales tax assistant. Determine the standard state/local sales tax rate for a customer at this location:
Location: "${locationText}"

Respond with ONLY a raw JSON object matching this schema, no markdown formatting or fences:
{"ratePercent": number, "rateName": string}
If unknown or tax is not applicable, return {"ratePercent": 0, "rateName": "No Sales Tax"}.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini status ${response.status}`);
    }

    const resJson = await response.json();
    const text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response');

    const result = JSON.parse(text);
    return NextResponse.json({
      ratePercent: Number(result.ratePercent) || 0,
      rateName: result.rateName || 'Sales Tax',
    });
  } catch (err) {
    console.error('Gemini tax suggestion failed, falling back', err);
    return NextResponse.json(localSuggest());
  }
}
