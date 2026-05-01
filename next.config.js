/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Three.js ships as ES modules; let Next transpile it if needed.
  transpilePackages: ['three'],
};

module.exports = nextConfig;
