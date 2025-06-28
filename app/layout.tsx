import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG Agent Chatbot",
  description: "A chatbot powered by LangChain, LangGraph, and Cohere",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
