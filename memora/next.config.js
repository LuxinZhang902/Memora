/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@elastic/elasticsearch', '@google-cloud/storage'],
  },
  // Increase function timeout for file processing
  serverRuntimeConfig: {
    maxDuration: 60,
  },
};

module.exports = nextConfig;
