import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Origin Supabase (https + wss) dari env publik. Kosong jika belum diset.
function supabaseOrigins(): { https: string[]; wss: string[] } {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return { https: [], wss: [] };
  try {
    const { origin, host } = new URL(raw);
    return { https: [origin], wss: [`wss://${host}`] };
  } catch {
    return { https: [], wss: [] };
  }
}

function buildCsp(): string {
  const sb = supabaseOrigins();
  const devLocal = isDev ? ["ws://localhost:*"] : [];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // TODO Fase 9: evaluasi CSP berbasis nonce. Inline script dari next-themes
    // masih butuh 'unsafe-inline' sekarang.
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...sb.https, ...sb.wss, ...devLocal],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    // OAuth redirect: form submit / redirect ke Supabase dan Google.
    "form-action": ["'self'", ...sb.https, "https://accounts.google.com"],
    "object-src": ["'none'"],
  };

  if (!isDev) directives["upgrade-insecure-requests"] = [];

  return Object.entries(directives)
    .map(([name, values]) => (values.length ? `${name} ${values.join(" ")}` : name))
    .join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: buildCsp() },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Impor ≤5000 baris (JSON) bisa >1MB; lihat lib/actions/import.ts.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
