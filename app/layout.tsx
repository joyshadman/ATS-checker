import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATS Checker — Resume Analyzer",
  description: "Analyze and improve your resume for ATS compatibility with AI-powered insights",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
