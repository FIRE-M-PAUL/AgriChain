import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";

/** Public RPC — override with private endpoint in production via env. */
export const SOLANA_RPC_URL =
  import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl("devnet");

export const SOLANA_PROGRAM_ID_STR = import.meta.env.VITE_SOLANA_PROGRAM_ID || "";

/**
 * devnet | testnet | mainnet-beta — explorer links + devnet detection.
 * Prefer VITE_SOLANA_NETWORK; VITE_SOLANA_CLUSTER still supported.
 */
export const SOLANA_CLUSTER = (
  import.meta.env.VITE_SOLANA_NETWORK ||
  import.meta.env.VITE_SOLANA_CLUSTER ||
  "devnet"
).trim();

export const SOLANA_EXPLORER_BASE =
  import.meta.env.VITE_SOLANA_EXPLORER ||
  import.meta.env.VITE_SOLANA_EXPLORER_BASE_URL ||
  "https://explorer.solana.com";

let connectionSingleton = null;

export function getSolanaConnection() {
  if (!connectionSingleton) {
    connectionSingleton = new Connection(SOLANA_RPC_URL, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 90_000,
    });
  }
  return connectionSingleton;
}

export function resetSolanaConnectionForTests() {
  connectionSingleton = null;
}

export function isDevnetLikeCluster() {
  const url = SOLANA_RPC_URL.toLowerCase();
  return (
    SOLANA_CLUSTER === "devnet" ||
    SOLANA_CLUSTER === "localnet" ||
    url.includes("devnet") ||
    url.includes("127.0.0.1") ||
    url.includes("localhost")
  );
}

/** Show devnet faucet UI when cluster is devnet-like OR explicit dev flag (preview builds). */
export function showDevnetFaucetUi() {
  return isDevnetLikeCluster() || import.meta.env.DEV === true;
}

export function lamportsToSol(lamports) {
  return Number(lamports || 0) / LAMPORTS_PER_SOL;
}

export function solToLamports(sol) {
  const n = Number(sol);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * LAMPORTS_PER_SOL);
}

export function explorerTxUrl(signature) {
  if (!signature || String(signature).startsWith("sim_")) return "";
  const sig = encodeURIComponent(signature);
  if (SOLANA_CLUSTER === "mainnet-beta" || SOLANA_CLUSTER === "mainnet") {
    return `${SOLANA_EXPLORER_BASE}/tx/${sig}`;
  }
  const cluster =
    SOLANA_CLUSTER === "testnet"
      ? "testnet"
      : SOLANA_CLUSTER === "devnet"
        ? "devnet"
        : "devnet";
  return `${SOLANA_EXPLORER_BASE}/tx/${sig}?cluster=${cluster}`;
}

export function explorerAddressUrl(address) {
  if (!address) return "";
  const a = encodeURIComponent(address);
  if (SOLANA_CLUSTER === "mainnet-beta" || SOLANA_CLUSTER === "mainnet") {
    return `${SOLANA_EXPLORER_BASE}/address/${a}`;
  }
  const cluster =
    SOLANA_CLUSTER === "testnet"
      ? "testnet"
      : SOLANA_CLUSTER === "devnet"
        ? "devnet"
        : "devnet";
  return `${SOLANA_EXPLORER_BASE}/address/${a}?cluster=${cluster}`;
}

export async function rpcGetLatestBlockhash(commitment = "confirmed") {
  const connection = getSolanaConnection();
  return connection.getLatestBlockhash(commitment);
}

export async function rpcGetBalanceLamports(walletAddress) {
  if (!walletAddress) return 0;
  const connection = getSolanaConnection();
  const pk = new PublicKey(walletAddress);
  return connection.getBalance(pk, "confirmed");
}

export async function rpcSimulateTransaction(transaction, commitment = "confirmed") {
  const connection = getSolanaConnection();
  /** @type {import("@solana/web3.js").SimulatedTransactionResponse} */
  const sim = await connection.simulateTransaction(transaction, undefined, commitment);
  return sim;
}

export async function rpcSendRawTransaction(rawTransaction, options = {}) {
  const connection = getSolanaConnection();
  return connection.sendRawTransaction(rawTransaction, {
    skipPreflight: false,
    maxRetries: 5,
    ...options,
  });
}

export async function rpcGetSignatureStatuses(signatures, config) {
  const connection = getSolanaConnection();
  return connection.getSignatureStatuses(signatures, config);
}

/**
 * Poll until confirmed/finalized or timeout.
 * @returns {{ ok: boolean, err?: unknown, confirmation?: string }}
 */
export async function rpcPollSignatureConfirmed(signature, {
  timeoutMs = 75_000,
  intervalMs = 1200,
} = {}) {
  const connection = getSolanaConnection();
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { value } = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    });
    const st = value?.[0];
    if (st?.confirmationStatus === "confirmed" || st?.confirmationStatus === "finalized") {
      return { ok: !st.err, err: st.err ?? null, confirmation: st.confirmationStatus };
    }
    if (st?.err) {
      return { ok: false, err: st.err };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { ok: false, err: new Error("Confirmation timed out.") };
}

export async function rpcGetTransaction(signature) {
  const connection = getSolanaConnection();
  return connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
}

export async function rpcGetAccountInfo(pubkeyBase58, commitment = "confirmed") {
  const connection = getSolanaConnection();
  const pk = new PublicKey(pubkeyBase58);
  return connection.getAccountInfo(pk, commitment);
}

/**
 * ProofRecord::LEN from agrichain_proof_program (fixed-size Anchor account).
 * 8 disc + 4 + 64 product_id + 32 + 32 + 8 + 1 + 1
 */
export const PROOF_ACCOUNT_DATA_SIZE = 150;

export async function rpcGetProgramProofAccounts(programIdStr = SOLANA_PROGRAM_ID_STR) {
  if (!programIdStr) return [];
  const connection = getSolanaConnection();
  const programId = new PublicKey(programIdStr);
  return connection.getProgramAccounts(programId, {
    commitment: "confirmed",
    filters: [{ dataSize: PROOF_ACCOUNT_DATA_SIZE }],
  });
}

export async function rpcGetSignaturesForAddress(addressStr, limit = 20) {
  if (!addressStr) return [];
  const connection = getSolanaConnection();
  const pk = new PublicKey(addressStr);
  return connection.getSignaturesForAddress(pk, { limit });
}

export async function rpcRequestAirdrop(walletAddress, solAmount = 1) {
  if (!isDevnetLikeCluster()) {
    throw new Error("Airdrop is only supported on devnet (or local) clusters.");
  }
  const connection = getSolanaConnection();
  const pk = new PublicKey(walletAddress);
  const lamports = Math.floor(Number(solAmount) * LAMPORTS_PER_SOL);
  const sig = await connection.requestAirdrop(pk, lamports);
  const latest = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    { signature: sig, ...latest },
    "confirmed"
  );
  return sig;
}

export function decodeProofAccountProductId(data) {
  const buf = data instanceof Uint8Array ? data : Uint8Array.from(data);
  if (buf.length < 8 + 4) return "";
  let offset = 8;
  const len = new DataView(buf.buffer, buf.byteOffset + offset, 4).getUint32(0, true);
  offset += 4;
  if (len <= 0 || offset + len > buf.length) return "";
  return new TextDecoder().decode(buf.slice(offset, offset + len));
}

export function summarizeSimulationFailure(sim) {
  const err = sim?.value?.err;
  const logs = sim?.value?.logs;
  if (!err && (!logs || !logs.length)) return "Simulation failed.";
  try {
    const errStr = typeof err === "object" ? JSON.stringify(err) : String(err);
    const tail = logs?.slice?.(-4)?.join("\n") || "";
    return tail ? `${errStr}\n${tail}` : errStr;
  } catch {
    return "Simulation failed.";
  }
}
