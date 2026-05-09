import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";

const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";
const SOLANA_PROGRAM_ID = import.meta.env.VITE_SOLANA_PROGRAM_ID || "";
const SOLANA_EXPLORER_BASE = import.meta.env.VITE_SOLANA_EXPLORER_BASE_URL || "https://explorer.solana.com";

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
  const programId = new PublicKey(SOLANA_PROGRAM_ID);
  const [pda] = PublicKey.findProgramAddressSync([textEncoder.encode("proof"), textEncoder.encode(productId)], programId);
  return pda;
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
  const provider = getPhantomProvider();
  if (!provider || !walletAddress || !productId || !SOLANA_PROGRAM_ID || !cropHashBytes) {
    return { signature: "", timestamp: "", proofPda: "", explorerUrl: "" };
  }

  try {
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const programId = new PublicKey(SOLANA_PROGRAM_ID);
    const fromPubkey = new PublicKey(walletAddress);
    const proofPda = await deriveProofPda(productId);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
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

    const signature = await provider.signAndSendTransaction(transaction);
    const txSignature = typeof signature === "string" ? signature : signature?.signature || "";

    return {
      signature: txSignature,
      timestamp: new Date().toISOString(),
      proofPda: proofPda.toBase58(),
      explorerUrl: txSignature
        ? `${SOLANA_EXPLORER_BASE}/tx/${txSignature}?cluster=devnet`
        : "",
    };
  } catch {
    return { signature: "", timestamp: "", proofPda: "", explorerUrl: "" };
  }
}

export async function verifySolanaProof({ productId, expectedCropHashHex }) {
  if (!SOLANA_PROGRAM_ID || !productId) {
    return { verified: false, proofExists: false, reason: "Program not configured." };
  }

  try {
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const proofPda = await deriveProofPda(productId);
    const accountInfo = await connection.getAccountInfo(proofPda, "confirmed");
    if (!accountInfo?.data) {
      return { verified: false, proofExists: false, reason: "Proof account not found.", proofPda: proofPda.toBase58() };
    }

    const data = new Uint8Array(accountInfo.data);
    let offset = 8; // Anchor account discriminator
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

export async function sendSolanaPayment({ buyerWallet, farmerWallet, lamports }) {
  const provider = getPhantomProvider();
  if (!provider || !buyerWallet || !farmerWallet || !lamports) {
    return { signature: "", explorerUrl: "" };
  }

  try {
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const buyerPubkey = new PublicKey(buyerWallet);
    const farmerPubkey = new PublicKey(farmerWallet);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

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

    const signature = await provider.signAndSendTransaction(transaction);
    const txSignature = typeof signature === "string" ? signature : signature?.signature || "";
    return {
      signature: txSignature,
      explorerUrl: txSignature ? `${SOLANA_EXPLORER_BASE}/tx/${txSignature}?cluster=devnet` : "",
    };
  } catch {
    return { signature: "", explorerUrl: "" };
  }
}
