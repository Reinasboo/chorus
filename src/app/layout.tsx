import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { NearWalletProvider } from "@/components/near-wallet-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Chorus — Many people. One purpose.",
    template: "%s · Chorus",
  },
  description: "Coordinate shared goals, contributions, approvals, and work in one accountable project space.",
  applicationName: "Chorus",
  keywords: ["collaboration", "project finance", "shared budgets", "NEAR"],
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0b0c0e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a className="skip-link" href="#main-content">Skip to content</a>
        <NearWalletProvider>{children}</NearWalletProvider>
      </body>
    </html>
  );
}
