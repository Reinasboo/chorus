"use client";

import type { ReactNode } from "react";
import { NearProvider } from "near-connect-hooks";

export function NearWalletProvider({ children }: { children: ReactNode }) {
  return (
    <NearProvider config={{ network: "mainnet", autoConnect: false }}>
      {children}
    </NearProvider>
  );
}
