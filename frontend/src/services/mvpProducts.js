import { supabase, hasSupabaseConfig } from "../lib/supabase";
import { uploadDataUrlPublic } from "./storageUpload";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function generateProductId() {
  return `AGRI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function ensureClient() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then apply supabase/migrations SQL in your project."
    );
  }
}

function parseJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function normalizeProfile(profile) {
  if (!profile || typeof profile !== "object") return {};
  return profile;
}

/** Maps DB row → UI shape used across MVP pages. */
export function rowToProduct(row) {
  if (!row) return null;
  const r = row;
  const fp = normalizeProfile(r.farmer_profile ?? r.farmerProfile);
  return {
    id: r.id,
    cropName: r.crop_name ?? r.cropName ?? "",
    quantity: r.quantity_display ?? r.quantity ?? "",
    quantityAvailable: toNumber(r.quantity_available ?? r.quantityAvailable, 0),
    unitType: r.unit_type ?? r.unitType ?? "units",
    pricePerUnit: toNumber(r.price_per_unit ?? r.pricePerUnit, 0.01),
    soldQuantity: toNumber(r.sold_quantity ?? r.soldQuantity, 0),
    totalTransactions: toNumber(r.total_transactions ?? r.totalTransactions, 0),
    inventoryStatus: r.inventory_status ?? r.inventoryStatus ?? "available",
    harvestDate: r.harvest_date ?? r.harvestDate ?? "",
    description: r.description ?? "",
    imageUrl: r.crop_image_url ?? r.imageUrl ?? "",
    walletAddress: r.wallet_address ?? r.walletAddress ?? r.farmer_wallet ?? "",
    farmerWallet: r.farmer_wallet ?? r.farmerWallet ?? "",
    farmerReference: r.farmer_reference ?? r.farmerReference ?? "",
    farmerProfile: Object.keys(fp).length ? fp : null,
    farmerName: fp.farmerName || r.farmer_name || "",
    province: fp.province || r.province || "",
    district: fp.district || r.district || "",
    qrCode: r.qr_code ?? r.qrCode ?? "",
    cropHash: r.crop_hash ?? r.cropHash ?? "",
    solanaProofPda: r.solana_proof_pda ?? r.solanaProofPda ?? "",
    blockchainSignature: r.blockchain_signature ?? r.blockchainSignature ?? "",
    blockchainTimestamp: r.blockchain_timestamp ?? r.blockchainTimestamp ?? "",
    blockchainExplorerUrl: r.blockchain_explorer_url ?? r.blockchainExplorerUrl ?? "",
    verificationStatus: r.verification_status ?? r.verificationStatus ?? "pending",
    purchases: parseJsonArray(r.purchases, []),
    createdAtIso: r.created_at ? new Date(r.created_at).toISOString() : r.createdAtIso ?? "",
    source: "supabase",
  };
}

function productToRow(record, cropImageUrlFinal) {
  const quantityAvailable = Math.max(0, Math.floor(toNumber(record.quantityAvailable, toNumber(record.quantity, 0))));
  const unitType = (record.unitType || "units").trim() || "units";
  const pricePerUnit = Math.max(0.0001, toNumber(record.pricePerUnit, 0.01));
  const soldQuantity = Math.max(0, Math.floor(toNumber(record.soldQuantity, 0)));
  const totalTransactions = Math.max(0, Math.floor(toNumber(record.totalTransactions, 0)));
  const inventoryStatus = quantityAvailable > 0 ? "available" : "sold_out";
  const profile = normalizeProfile(record.farmerProfile);
  const farmerName = profile.farmerName || record.farmerName || "";

  return {
    id: record.id,
    crop_name: record.cropName,
    quantity_display: record.quantity || `${quantityAvailable} ${unitType}`,
    quantity_available: quantityAvailable,
    unit_type: unitType,
    price_per_unit: pricePerUnit,
    sold_quantity: soldQuantity,
    total_transactions: totalTransactions,
    inventory_status: inventoryStatus,
    harvest_date: record.harvestDate || "",
    description: record.description || "",
    crop_image_url: cropImageUrlFinal || record.imageUrl || "",
    farmer_name: farmerName,
    farmer_wallet: record.walletAddress || record.farmerWallet || "",
    province: profile.province || record.province || "",
    district: profile.district || record.district || "",
    wallet_address: record.walletAddress || record.farmerWallet || "",
    farmer_reference: record.farmerReference || record.walletAddress || "",
    farmer_profile: profile,
    qr_code: record.qrCode || "",
    crop_hash: record.cropHash || "",
    solana_proof_pda: record.solanaProofPda || "",
    blockchain_signature: record.blockchainSignature || "",
    blockchain_timestamp: record.blockchainTimestamp ? String(record.blockchainTimestamp) : "",
    blockchain_explorer_url: record.blockchainExplorerUrl || "",
    verification_status: record.blockchainSignature ? "verified_on_chain" : "pending",
    purchases: Array.isArray(record.purchases) ? record.purchases : [],
  };
}

async function insertVerificationRecord(productId, walletAddress, proof) {
  ensureClient();
  const { error } = await supabase.from("verification_records").insert({
    wallet_address: walletAddress,
    product_id: productId,
    record_type: "crop_proof",
    payload: proof || {},
    blockchain_signature: proof?.signature ?? null,
  });
  if (error) console.warn("[AGRICHAIN] verification_records insert skipped", error.message);
}

export async function saveProductRecord(record) {
  ensureClient();

  let cropPublicUrl = record.imageUrl || "";
  if (record.imageUrl && record.imageUrl.startsWith("data:")) {
    const ext = record.imageUrl.startsWith("data:image/png") ? "png" : "jpg";
    const path = `${record.walletAddress}/${record.id}/crop.${ext}`;
    cropPublicUrl = await uploadDataUrlPublic("crop-images", path, record.imageUrl);
  }

  const row = productToRow(record, cropPublicUrl);

  const { error } = await supabase.from("products").upsert(row, { onConflict: "id" });
  if (error) throw error;

  if (record.blockchainSignature || record.solanaProofPda) {
    await insertVerificationRecord(record.id, record.walletAddress, {
      signature: record.blockchainSignature,
      proofPda: record.solanaProofPda,
      cropHash: record.cropHash,
    });
  }

  const hydrated = rowToProduct({ ...row, crop_image_url: cropPublicUrl });
  hydrated.createdAtIso = new Date().toISOString();
  return hydrated;
}

export async function getProductById(productId) {
  if (!productId) return null;
  ensureClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
  if (error) throw error;
  return rowToProduct(data);
}

export async function listProducts() {
  ensureClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToProduct);
}

/**
 * Postgres changes subscription — Dashboard must enable Replication for `products`.
 * @returns {() => void} unsubscribe
 */
export function subscribeToProductChanges(onEvent) {
  if (!supabase || !hasSupabaseConfig) return () => {};
  const channel = supabase
    .channel("mvp-products-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "products" },
      () => {
        Promise.resolve(onEvent?.()).catch(() => {});
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function recordProductPurchase(productId, purchase) {
  ensureClient();
  if (!productId || !purchase) return null;
  const requestedQuantity = Math.max(1, Math.floor(toNumber(purchase.quantityPurchased, 1)));

  const farmerWallet =
    typeof purchase.farmerWallet === "string" ? purchase.farmerWallet : purchase.farmerWallet || "";

  const { data, error } = await supabase.rpc("record_product_purchase", {
    p_product_id: productId,
    p_buyer_wallet: purchase.buyerWallet,
    p_farmer_wallet: farmerWallet,
    p_quantity: requestedQuantity,
    p_total_sol: toNumber(purchase.totalPaymentSol, 0),
    p_lamports: purchase.lamports != null ? Number(purchase.lamports) : null,
    p_signature: purchase.signature ?? "",
    p_explorer_url: purchase.explorerUrl ?? "",
    p_unit_type: purchase.unitType ?? "",
    p_purchased_at_iso: purchase.purchasedAtIso || new Date().toISOString(),
  });

  if (error) throw new Error(error.message || "Purchase failed.");
  return rowToProduct(data);
}
