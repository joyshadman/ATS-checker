import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-auth", "@prisma/client", "pdfjs-dist"],
  // Resume/cover letter uploads go through Server Actions. The 1mb default
  // rejects most real resumes; 4mb stays under Vercel's 4.5MB body limit.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
