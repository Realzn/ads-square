/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // requis pour Cloudflare Pages (pas de serveur d'images Next.js)
  },
  webpack: (config) => {
    // async_hooks est un module Node.js non disponible dans l'Edge Runtime (Cloudflare Workers).
    // @supabase/supabase-js le référence indirectement — on le remplace par un stub vide.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      async_hooks: false,
    };
    return config;
  },
};

module.exports = nextConfig;
