/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // requis pour Cloudflare Pages (pas de serveur d'images Next.js)
  },
};

module.exports = nextConfig;
