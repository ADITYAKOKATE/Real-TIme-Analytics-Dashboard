/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@analytics/shared'],
  reactStrictMode: true,
  output: 'standalone',
};

module.exports = nextConfig;
