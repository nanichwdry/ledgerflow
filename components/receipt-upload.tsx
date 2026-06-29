'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function ReceiptUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/receipts', { method: 'POST', body: formData });
    setUploading(false);
    if (res.ok) {
      router.refresh();
    } else {
      const body = await res.json();
      setError(typeof body.error === 'string' ? body.error : 'Could not process that receipt.');
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? 'Reading receipt…' : '+ Upload receipt'}
      </Button>
      {error && <p className="mt-2 text-sm text-debit">{error}</p>}
    </div>
  );
}
