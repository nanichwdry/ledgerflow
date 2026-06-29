import { createClient } from '@/lib/supabase/server';

const BUCKET = 'receipts';

export async function uploadReceiptImage(organizationId: string, file: Buffer, contentType: string) {
  const supabase = createClient();
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${organizationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType });
  if (error) throw new Error(`Failed to upload receipt image: ${error.message}`);

  return path;
}

export async function getReceiptSignedUrl(storagePath: string) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60); // 1 hour
  if (error) throw new Error(`Failed to sign receipt URL: ${error.message}`);
  return data.signedUrl;
}
