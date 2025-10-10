/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@elastic/elasticsearch', '@google-cloud/storage'],
  },
};

module.exports = nextConfig;
