import "server-only";

import { JsonRpcProvider } from "near-api-js";
import { verifyMessage } from "near-api-js/nep413";

export function getNearMessageRecipient() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000";
  return new URL(appUrl).host;
}

export async function verifyNearWalletSignature({
  accountId,
  publicKey,
  signature,
  message,
  recipient,
  nonce,
}: {
  accountId: string;
  publicKey: string;
  signature: Uint8Array;
  message: string;
  recipient: string;
  nonce: Uint8Array;
}) {
  const provider = new JsonRpcProvider({
    url: process.env.NEAR_RPC_URL ?? "https://free.rpc.fastnear.com",
  });
  await verifyMessage({
    signerAccountId: accountId,
    signerPublicKey: publicKey,
    signature,
    payload: { message, recipient, nonce },
    provider,
  });
}
