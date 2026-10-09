"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { env } from "@/lib/env";

import "@solana/wallet-adapter-react-ui/styles.css";

/**
 * Client-only wallet context. Loaded dynamically with `ssr: false` so the
 * wallet-adapter (which touches `window`) never runs during server rendering.
 */
export default function WalletContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    [],
  );

  return (
    <ConnectionProvider endpoint={env.rpcUrl}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
