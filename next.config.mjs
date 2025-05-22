/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal configuration without any custom webpack rules
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  }
};

export default nextConfig;
