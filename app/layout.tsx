import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { NetworkSwitcher } from "@/components/wallet/NetworkSwitcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rabbit Hole - Dual-Mode Privacy Token",
  description: "A hybrid token supporting both confidential (ERC-7984) and plain (ERC-20) modes with seamless conversion",
  icons: {
    icon: [
      { url: "/icon.svg", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.svg", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          src="https://cdn.zama.org/relayer-sdk-js/0.3.0-5/relayer-sdk-js.umd.cjs"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <Web3Provider>
          <NetworkSwitcher />
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
