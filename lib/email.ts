import { Resend } from 'resend';
import { IS_MOCK_MODE } from '@/lib/env';

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 'your-resend-api-key') return null;
  return new Resend(apiKey);
}

export function isEmailConfigured() {
  if (IS_MOCK_MODE) return true;
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && process.env.RESEND_API_KEY !== 'your-resend-api-key');
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachment?: { filename: string; content: Buffer; contentType?: string };
}) {
  const isMock = IS_MOCK_MODE || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your-resend-api-key';
  if (isMock) {
    console.log('--- [MOCK EMAIL SENT] ---');
    console.log(`To: ${input.to}`);
    console.log(`Subject: ${input.subject}`);
    console.log(`Body (HTML length): ${input.html.length} chars`);
    if (input.attachment) {
      console.log(`Attachment: ${input.attachment.filename} (${input.attachment.content.length} bytes)`);
    }
    console.log('-------------------------');
    return { id: 'mock-resend-id-' + Math.random().toString(36).substring(7) };
  }

  const client = getClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!client || !from) {
    throw new Error(
      'Email isn\'t configured — set RESEND_API_KEY and RESEND_FROM_EMAIL to enable sending.'
    );
  }

  const { data, error } = await client.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    replyTo: input.replyTo,
    attachments: input.attachment
      ? [
          {
            filename: input.attachment.filename,
            content: input.attachment.content,
            contentType: input.attachment.contentType,
          },
        ]
      : undefined,
  });

  if (error) throw new Error(error.message ?? 'Resend rejected this email.');
  return data;
}

