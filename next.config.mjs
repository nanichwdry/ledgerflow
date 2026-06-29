/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
  // HSTS only matters once you're actually serving over HTTPS (true for any
  // real deploy target — Vercel, a reverse-proxied VPS, etc.); harmless in dev.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig = {
  // Smaller, self-contained build output — the basis for the Dockerfile.
  output: 'standalone',
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async headers() {
    return [
      {
        // Stripe/Plaid webhook routes are server-to-server and ignore these
        // browser-targeted headers anyway, so applying them everywhere is fine.
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
