import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Ver lib/cloudinaryLoader.ts: evita el cupo de optimización de imágenes de Vercel (402).
    loader: 'custom',
    loaderFile: './lib/cloudinaryLoader.ts',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
