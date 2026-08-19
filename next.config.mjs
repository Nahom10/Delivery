/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: '.next-webpack',
  transpilePackages: ['@allfreshmart/core'],
  images: { remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }] }
};

export default nextConfig;
