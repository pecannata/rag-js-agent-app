import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";

// Check if Clerk is properly configured
const hasValidClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_') && 
                         !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('YOUR_');

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agentic RAG Chat",
  description: "AI-powered chat application with RAG capabilities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );

  // Only wrap with ClerkProvider if we have valid keys
  if (hasValidClerkKeys) {
    return (
      <ClerkProvider>
        {content}
      </ClerkProvider>
    );
  }

  // Return without ClerkProvider for development
  return content;
}
