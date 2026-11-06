import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cover images and article images are uploaded at runtime and served by /api/files.
  // sanitize-html is bundled on purpose: its dependency htmlparser2@12 is ESM-only and Vercel's runtime loader cannot require() it.
  serverExternalPackages: ["@prisma/client"],
  // Vercel demo: ship the seeded SQLite DB and seed images with every server function.
  outputFileTracingIncludes: { "/**": ["./prisma/demo.db", "./data/uploads/**"] },
  experimental: {
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
