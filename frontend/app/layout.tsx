import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
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
    "Create, send and get paid. InvoiceAI tracks every invoice from draft to paid and writes polite follow-ups for you.",
  keywords: ["invoicing", "invoice", "billing", "freelance", "AI", "payments"],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "InvoiceAI",
    title: "InvoiceAI — Smart Invoicing for Freelancers",
    description:
      "Create, send and get paid. Invoice tracking with AI-written follow-ups.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0E14" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jakarta.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
