import type { NextConfig } from "next";

const isPages = process.env.BUILD_TARGET === "pages";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true
  },
  output: 'export',
  basePath: isPages ? "/RedTrack" : "",
  assetPrefix: isPages ? "/RedTrack/" : "",
  trailingSlash: true,
};

export default nextConfig;
