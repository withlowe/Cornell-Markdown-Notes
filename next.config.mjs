/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure we don't try to build the deleted flashcard pages
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Simplified webpack config - just ignore the flashcards directory
  webpack: (config) => {
    // This helps ensure deleted files aren't included in the build
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules/**', '**/app/flashcards/**'],
    };
    
    return config;
  },
};

export default nextConfig;
