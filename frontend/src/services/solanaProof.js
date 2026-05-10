import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  SOLANA_PROGRAM_ID_STR,
  decodeProofAccountProductId,
  explorerTxUrl,
  lamportsToSol,
  rpcGetLatestBlockhash,
  rpcGetProgramProofAccounts,
  rpcGetSignaturesForAddress,
  rpcGetTransaction,
  rpcPollSignatureConfirmed,
  rpcRequestAirdrop,
  rpcSendRawTransaction,
  rpcSimulateTransaction,
  rpcGetBalanceLamports,
  rpcGetAccountInfo,
  showDevnetFaucetUi,
  summarizeSimulationFailure,
  isDevnetLikeCluster,
} from "./solanaRpc";

export { getSolanaConnection } from "./solanaRpc";

function getPhantomProvider() {
  if (typeof window === "undefined") return null;
  const provider = window.solana;
  if (!provider || !provider.isPhantom) return null;
  return provider;
}

const textEncoder = new TextEncoder();

async function sha256Bytes(input) {
  const hash = await crypto.subtle.digest("SHA-256", textEncoder.encode(input));
  return new Uint8Array(hash);
}

function encodeAnchorString(value) {
  const bytes = textEncoder.encode(value);
  const out = new Uint8Array(4 + bytes.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, bytes.length, true);
  out.set(bytes, 4);
  return out;
}

function concatUint8Arrays(...parts) {
  const length = parts.reduce((acc, item) => acc + item.length, 0);
  const merged = new Uint8Array(length);
  let offset = 0;
  parts.forEach((item) => {
    merged.set(item, offset);
    offset += item.length;
  });
  return merged;
}

async function getInstructionDiscriminator(ixName) {
  const preimage = `global:${ixName}`;
  const hash = await sha256Bytes(preimage);
  return hash.slice(0, 8);
}

async function deriveProofPda(productId) {
  const programId = new PublicKey(SOLANA_PROGRAM_ID_STR);
  const [pda] = PublicKey.findProgramAddressSync(
    [textEncoder.encode("proof"), textEncoder.encode(productId)],
    programId
  );
  return pda;
}

async function signAndSubmitTransaction(transaction) {
  const provider = getPhantomProvider();
  if (!provider) throw new Error("Phantom wallet not available.");

  let signature;

  if (typeof provider.signTransaction === "function") {
    const signed = await provider.signTransaction(transaction);
    const raw = signed.serialize();
    signature = await rpcSendRawTransaction(raw);
  } else {
    const out = await provider.signAndSendTransaction(transaction);
    signature = typeof out === "string" ? out : out?.signature;
  }

  if (!signature) throw new Error("Missing transaction signature.");

  const poll = await rpcPollSignatureConfirmed(signature);
  if (!poll.ok) {
    throw new Error(poll.err ? String(JSON.stringify(poll.err)) : "Transaction failed on-chain.");
  }

  const meta = await rpcGetTransaction(signature);
  return {
    signature,
    slot: meta?.slot,
    blockTime: meta?.blockTime != null ? meta.blockTime : null,
  };
}

export async function buildCropHash({ productId, cropName, quantity, walletAddress }) {
  const input = `${productId}|${cropName}|${quantity}|${walletAddress}`;
  const hash = await sha256Bytes(input);
  return {
    bytes: hash,
    hex: Array.from(hash)
      .map((item) => item.toString(16).padStart(2, "0"))
      .join(""),
  };
}

export async function recordSolanaProof({ productId, walletAddress, cropHashBytes }) {
  if (!SOLANA_PROGRAM_ID_STR || !walletAddress || !productId || !cropHashBytes) {
    return {
      signature: "",
      timestamp: "",
      proofPda: "",
      explorerUrl: "",
      error: !SOLANA_PROGRAM_ID_STR ? "Program ID not configured." : "Missing proof parameters.",
    };
  }

  const provider = getPhantomProvider();
  if (!provider) {
    return { signature: "", timestamp: "", proofPda: "", explorerUrl: "", error: "Phantom not connected." };
  }

  try {
    const programId = new PublicKey(SOLANA_PROGRAM_ID_STR);
    const fromPubkey = new PublicKey(walletAddress);
    const proofPda = await deriveProofPda(productId);
    const { blockhash, lastValidBlockHeight } = await rpcGetLatestBlockhash("confirmed");
    const ixDiscriminator = await getInstructionDiscriminator("record_product_proof");
    const ixData = concatUint8Arrays(ixDiscriminator, encodeAnchorString(productId), cropHashBytes);

    const transaction = new Transaction({
      feePayer: fromPubkey,
      blockhash,
      lastValidBlockHeight,
    }).add(
      new TransactionInstruction({
        programId,
        keys: [
          { pubkey: proofPda, isSigner: false, isWritable: true },
          { pubkey: fromPubkey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: ixData,
      })
    );

    const sim = await rpcSimulateTransaction(transaction);
    if (sim.value.err) {
      return {
        signature: "",
        timestamp: "",
        proofPda: proofPda.toBase58(),
        explorerUrl: "",
        error: summarizeSimulationFailure(sim),
      };
    }

    const { signature } = await signAndSubmitTransaction(transaction);
    const iso = new Date().toISOString();

    return {
      signature,
      timestamp: iso,
      proofPda: proofPda.toBase58(),
      explorerUrl: explorerTxUrl(signature),
    };
  } catch (e) {
    return {
      signature: "",
      timestamp: "",
      proofPda: "",
      explorerUrl: "",
      error: e?.message || "Solana proof transaction failed.",
    };
  }
}

export async function verifySolanaProof({ productId, expectedCropHashHex }) {
  if (!SOLANA_PROGRAM_ID_STR || !productId) {
    return { verified: false, proofExists: false, reason: "Program not configured." };
  }

  try {
    const proofPda = await deriveProofPda(productId);
    const accountInfo = await rpcGetAccountInfo(proofPda.toBase58(), "confirmed");
    if (!accountInfo?.data) {
      return {
        verified: false,
        proofExists: false,
        reason: "Proof account not found.",
        proofPda: proofPda.toBase58(),
      };
    }

    const data = new Uint8Array(accountInfo.data);
    let offset = 8;
    const productIdLen = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
    offset += 4 + productIdLen;
    const farmerWalletBytes = data.slice(offset, offset + 32);
    offset += 32;
    const cropHashBytes = data.slice(offset, offset + 32);
    offset += 32;
    const timestamp = Number(new DataView(data.buffer, data.byteOffset + offset, 8).getBigInt64(0, true));
    offset += 8;
    const verificationStatus = Boolean(data[offset]);

    const onChainCropHashHex = Array.from(cropHashBytes)
      .map((item) => item.toString(16).padStart(2, "0"))
      .join("");
    const wallet = new PublicKey(farmerWalletBytes).toBase58();
    const hashMatch = expectedCropHashHex ? onChainCropHashHex === expectedCropHashHex : true;

    return {
      verified: hashMatch && verificationStatus,
      proofExists: true,
      hashMatch,
      onChainCropHashHex,
      wallet,
      timestampIso: new Date(timestamp * 1000).toISOString(),
      proofPda: proofPda.toBase58(),
    };
  } catch {
    return { verified: false, proofExists: false, reason: "Solana verification lookup failed." };
  }
}

/** Optional: enrich listing proof tx from Supabase `blockchainSignature` (farmer record tx). */
export async function fetchSettlementTransactionSummary(signature) {
  if (!signature || String(signature).startsWith("sim_")) return null;
  try {
    const tx = await rpcGetTransaction(signature);
    if (!tx) return { found: false };
    return {
      found: true,
      slot: tx.slot,
      blockTime: tx.blockTime,
      err: tx.meta?.err ?? null,
    };
  } catch {
    return { found: false };
  }
}

const ESTIMATE_FEE_LAMPORTS = 10_000;

export async function fetchWalletSolBalance(walletAddress) {
  if (!walletAddress) return { lamports: 0, sol: 0 };
  const lamports = await rpcGetBalanceLamports(walletAddress);
  return { lamports, sol: lamportsToSol(lamports) };
}

/**
 * Preflight transfer used at checkout (does not submit).
 */
export async function simulateBuyerToFarmerTransfer({ buyerWallet, farmerWallet, lamports }) {
  if (!buyerWallet || !farmerWallet || !lamports) {
    return { ok: false, error: "Missing payment parameters." };
  }
  try {
    const buyerPubkey = new PublicKey(buyerWallet);
    const farmerPubkey = new PublicKey(farmerWallet);
    const balance = await rpcGetBalanceLamports(buyerWallet);
    if (balance < lamports + ESTIMATE_FEE_LAMPORTS) {
      return {
        ok: false,
        error: `Insufficient SOL (need ~${lamportsToSol(lamports + ESTIMATE_FEE_LAMPORTS).toFixed(4)} SOL incl. fees; have ${lamportsToSol(balance).toFixed(4)} SOL).`,
      };
    }

    const { blockhash, lastValidBlockHeight } = await rpcGetLatestBlockhash("confirmed");
    const transaction = new Transaction({
      feePayer: buyerPubkey,
      blockhash,
      lastValidBlockHeight,
    }).add(
      SystemProgram.transfer({
        fromPubkey: buyerPubkey,
        toPubkey: farmerPubkey,
        lamports,
      })
    );

    const sim = await rpcSimulateTransaction(transaction);
    if (sim.value.err) {
      return { ok: false, error: summarizeSimulationFailure(sim) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Transfer simulation failed." };
  }
}

export async function sendSolanaPayment({ buyerWallet, farmerWallet, lamports }) {
  if (!buyerWallet || !farmerWallet || !lamports) {
    return { signature: "", explorerUrl: "", error: "Missing payment parameters." };
  }

  const provider = getPhantomProvider();
  if (!provider) {
    return { signature: "", explorerUrl: "", error: "Phantom wallet not connected in this browser." };
  }

  try {
    const buyerPubkey = new PublicKey(buyerWallet);
    const farmerPubkey = new PublicKey(farmerWallet);

    const balance = await rpcGetBalanceLamports(buyerWallet);
    if (balance < lamports + ESTIMATE_FEE_LAMPORTS) {
      return {
        signature: "",
        explorerUrl: "",
        error: `Insufficient SOL for this purchase (need ~${lamportsToSol(lamports + ESTIMATE_FEE_LAMPORTS).toFixed(4)} SOL incl. fees).`,
      };
    }

    const { blockhash, lastValidBlockHeight } = await rpcGetLatestBlockhash("confirmed");
    const transaction = new Transaction({
      feePayer: buyerPubkey,
      blockhash,
      lastValidBlockHeight,
    }).add(
      SystemProgram.transfer({
        fromPubkey: buyerPubkey,
        toPubkey: farmerPubkey,
        lamports,
      })
    );

    const sim = await rpcSimulateTransaction(transaction);
    if (sim.value.err) {
      return {
        signature: "",
        explorerUrl: "",
        error: summarizeSimulationFailure(sim),
      };
    }

    const { signature, blockTime } = await signAndSubmitTransaction(transaction);

    return {
      signature,
      explorerUrl: explorerTxUrl(signature),
      confirmed: true,
      blockTime: blockTime != null ? blockTime : undefined,
    };
  } catch (e) {
    return {
      signature: "",
      explorerUrl: "",
      error: e?.message || "Payment transaction failed.",
    };
  }
}

let proofIdsCache = { ids: null, ts: 0 };
const PROOF_IDS_TTL_MS = 45_000;

export async function fetchOnChainProofProductIds({ force = false } = {}) {
  if (!SOLANA_PROGRAM_ID_STR) return new Set();
  const now = Date.now();
  if (!force && proofIdsCache.ids && now - proofIdsCache.ts < PROOF_IDS_TTL_MS) {
    return proofIdsCache.ids;
  }
  try {
    const accounts = await rpcGetProgramProofAccounts(SOLANA_PROGRAM_ID_STR);
    const ids = new Set();
    for (const { account } of accounts) {
      const id = decodeProofAccountProductId(account.data);
      if (id) ids.add(id);
    }
    proofIdsCache = { ids, ts: now };
    return ids;
  } catch {
    return proofIdsCache.ids || new Set();
  }
}

export async function fetchWalletRecentSignatures(walletAddress, limit = 15) {
  if (!walletAddress) return [];
  try {
    return await rpcGetSignaturesForAddress(walletAddress, limit);
  } catch {
    return [];
  }
}

export async function requestDevnetSolAirdrop(walletAddress, solAmount = 1) {
  if (!showDevnetFaucetUi() || !isDevnetLikeCluster()) {
    throw new Error("Devnet airdrop is not enabled for this deployment.");
  }
  return rpcRequestAirdrop(walletAddress, solAmount);
}
