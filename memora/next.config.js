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
  // Configure headers including CSP
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.dedaluslabs.ai https://api.fireworks.ai https://api.elevenlabs.io https://storage.googleapis.com",
              "media-src 'self' blob:",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
