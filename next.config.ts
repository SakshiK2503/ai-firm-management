import type { NextConfig } from 'next';

// Non-CSP security headers - low-risk to add and don't need careful directive tuning. A real
// Content-Security-Policy is deliberately deferred to the Audit & Security hardening phase
// (Day 131+) rather than guessed at here - a wrong CSP silently breaks fonts/hydration, and
// getting it right (nonces, strict-dynamic) is its own piece of work, not a 1-hour baseline day.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
