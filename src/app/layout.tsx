import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import WalletRootProvider from "@/components/wallet/WalletRootProvider";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "AidBlink — emergency aid in a single link",
  description:
    "Contribute SOL through a Solana Blink and turn it into one-time food or transport vouchers for people in need.",
  icons: { icon: "/aidblink-icon.svg" },
  other: {
    "solana:network": env.network,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WalletRootProvider>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <Footer />
        </WalletRootProvider>
      </body>
    </html>
  );
}
