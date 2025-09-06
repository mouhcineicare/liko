/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: process.env.NODE_ENV !== 'development', // Disable always
  eslint: {
    ignoreDuringBuilds: true, // OK for now
  },
  typescript: {
    ignoreBuildErrors: true, // OK temporarily
  },
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
    domains: [
      "localhost",
      "therapy-glow-bv8l.vercel.app",
      "images.unsplash.com",
      "w7.pngwing.com",
      "icarewellbeing.com",
      "app.icarewellbeing.com",
      "png.pngtree.com"
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['mongoose'], // Keep if you use mongoose server-side only
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
};
module.exports = nextConfig;
