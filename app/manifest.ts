import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LedgerFlow — Books that balance themselves',
    short_name: 'LedgerFlow',
    description: 'Double-entry bookkeeping with live bank feeds, invoicing, and receipt OCR.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F6F3EA',
    theme_color: '#14201C',
    icons: [
      { src: '/icon-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
