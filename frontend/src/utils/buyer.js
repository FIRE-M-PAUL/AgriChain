const BUYER_SCAN_HISTORY_KEY = "agrichain_buyer_scan_history";
const BUYER_SAVED_PRODUCTS_KEY = "agrichain_buyer_saved_products";
const BUYER_SAVED_FARMERS_KEY = "agrichain_buyer_saved_farmers";

function readJson(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getBuyerScanHistory() {
  return readJson(BUYER_SCAN_HISTORY_KEY);
}

export function addBuyerScan(entry) {
  const history = getBuyerScanHistory();
  const next = [{ ...entry, scanned_at: new Date().toISOString() }, ...history].slice(0, 50);
  writeJson(BUYER_SCAN_HISTORY_KEY, next);
  return next;
}

export function hasDuplicateScan(productId) {
  if (!productId) return false;
  const history = getBuyerScanHistory();
  return history.filter((item) => item.product_id === productId).length >= 2;
}

export function getSavedProducts() {
  return readJson(BUYER_SAVED_PRODUCTS_KEY);
}

export function toggleSavedProduct(productId) {
  const saved = new Set(getSavedProducts());
  if (saved.has(productId)) saved.delete(productId);
  else saved.add(productId);
  const next = [...saved];
  writeJson(BUYER_SAVED_PRODUCTS_KEY, next);
  return next;
}

export function getSavedFarmers() {
  return readJson(BUYER_SAVED_FARMERS_KEY);
}

export function toggleSavedFarmer(farmerWallet) {
  const saved = new Set(getSavedFarmers());
  if (saved.has(farmerWallet)) saved.delete(farmerWallet);
  else saved.add(farmerWallet);
  const next = [...saved];
  writeJson(BUYER_SAVED_FARMERS_KEY, next);
  return next;
}

export function deriveVerificationInsights(product) {
  if (!product) {
    return {
      blockchainVerified: false,
      aiVerified: false,
      verifiedFarmer: false,
      authenticityScore: 0,
      authenticityLevel: "Low",
      qualityLabel: "Needs review",
      warnings: [],
    };
  }

  const blockchainVerified = String(product.blockchain_status || "").toLowerCase().includes("verify");
  const aiVerified = String(product.ai_status || "").toLowerCase().includes("verify");
  const verifiedFarmer = Boolean(product.farmer_wallet);
  const confidence = Number(product.ai_confidence || 0);
  const duplicateQrDetected = hasDuplicateScan(product.unique_code);

  const warnings = [];
  if (!verifiedFarmer) warnings.push("Unverified Farmer");
  if (!aiVerified) warnings.push("AI mismatch detected");
  if (!blockchainVerified) warnings.push("Product not blockchain verified");
  if (duplicateQrDetected) warnings.push("Duplicate QR detected");

  const authenticityScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        confidence * 0.5 +
          (blockchainVerified ? 25 : 0) +
          (aiVerified ? 15 : 0) +
          (verifiedFarmer ? 10 : 0) -
          (duplicateQrDetected ? 15 : 0)
      )
    )
  );

  return {
    blockchainVerified,
    aiVerified,
    verifiedFarmer,
    authenticityScore,
    authenticityLevel: authenticityScore >= 85 ? "High" : authenticityScore >= 60 ? "Medium" : "Low",
    qualityLabel: aiVerified ? "Passed" : "Needs review",
    warnings,
  };
}
