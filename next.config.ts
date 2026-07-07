import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-auth", "@prisma/client", "pdfjs-dist"],
};

export default nextConfig;
