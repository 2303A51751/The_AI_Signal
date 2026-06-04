/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Silence Prisma edge warnings in API routes
  serverExternalPackages: ['@prisma/client', 'prisma'],
};

module.exports = nextConfig;
