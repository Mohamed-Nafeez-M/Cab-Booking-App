/** @type {import('next').NextConfig} */

const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  // Mirrors the old Vite dev-server proxy: the app calls relative `/api/...`
  // paths, and this rewrites them to the api-server package in development.
  // In production, put a real reverse proxy (or set API_PROXY_TARGET) in front
  // of both services instead.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
