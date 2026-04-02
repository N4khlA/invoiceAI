import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "InvoiceAI — Smart Invoicing for Freelancers",
    template: "%s | InvoiceAI",
  },
  description:
    "AI-powered invoice management: create, send, and collect payments with smart follow-ups. Built for freelancers and small businesses.",
  keywords: ["invoicing", "invoice", "billing", "freelance", "AI", "payments"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://invoiceai.app",
    siteName: "InvoiceAI",
    title: "InvoiceAI — Smart Invoicing for Freelancers",
    description:
      "AI-powered invoice management with smart follow-ups and payment tracking.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
