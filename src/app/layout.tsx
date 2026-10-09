import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import WalletRootProvider from "@/components/wallet/WalletRootProvider";
import { env } from "@/lib/env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AidBlink — emergency aid in a single link",
    template: "%s · AidBlink",
  },
  description:
    "Contribute SOL through a Solana Blink and turn it into one-time food or transport vouchers for people in need.",
  icons: { icon: "/aidblink-icon.svg" },
  openGraph: {
    title: "AidBlink — emergency aid in a single link",
    description:
      "A transparent aid pipeline on Solana: contribute via a Blink, approve a need, deliver a one-time benefit voucher.",
    type: "website",
  },
  other: {
    "solana:network": env.network,
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f9fb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <WalletRootProvider>
          <div className="flex min-h-screen flex-col">
            <Nav />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
              {children}
            </main>
            <Footer />
          </div>
        </WalletRootProvider>
      </body>
    </html>
  );
}
