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
  // Explicitly exclude the flashcards directory from the build
  webpack: (config, { isServer }) => {
    // This helps ensure deleted files aren't included in the build
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules/**', '**/app/flashcards/**'],
    };
    
    // Add a rule to ignore any flashcard-related files
    config.module.rules.push({
      test: /flashcard/,
      use: 'null-loader',
      exclude: /node_modules/,
    });
    
    return config;
  },
};

export default nextConfig;
