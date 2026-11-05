import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cover images and article images are uploaded at runtime and served by /api/files.
  serverExternalPackages: ["@prisma/client", "sanitize-html"],
  experimental: {
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
