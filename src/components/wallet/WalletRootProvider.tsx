"use client";

import dynamic from "next/dynamic";

const WalletContextProvider = dynamic(
  () => import("./WalletContextProvider"),
  { ssr: false },
);

export default function WalletRootProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WalletContextProvider>{children}</WalletContextProvider>;
}
