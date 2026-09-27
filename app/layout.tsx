import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Golden Crust Bakery — Chatbot Integration Demo",
  description:
    "Demo site showing a chatbot integrated via a one-line script snippet, with contact collection and webhook delivery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {/* Chatbot integration snippet — this is the exact one-line embed
            shown in the "How this was integrated" section below. */}
        <script src="/chatbot-snippet.js" data-key="demo"></script>
      </body>
    </html>
  );
}
