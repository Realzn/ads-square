/** @type {import('next').NextConfig} */
const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config) => config;

const nextConfig = {
  images: {
    unoptimized: true, // requis pour Cloudflare Pages (pas de serveur d'images Next.js)
  },

  // Headers de sécurité pour le serveur de développement Next.js
  // (en production Cloudflare Pages, ils sont définis dans public/_headers)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-Frame-Options',          value: 'DENY' },
          { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
