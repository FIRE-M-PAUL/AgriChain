import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Camera, ImageUp, ShieldCheck, TriangleAlert } from "lucide-react";
import { getProductById, isProductVerifiedForMarketplace } from "../services/mvpProducts";
import { verifySolanaProof } from "../services/solanaProof";

function getProductIdFromQr(raw = "") {
  try {
    const url = new URL(raw);
    return url.searchParams.get("id") || url.searchParams.get("productId") || raw.trim();
  } catch {
    return raw.trim();
  }
}

export default function MvpScanPage() {
  const [params] = useSearchParams();
  const [manualValue, setManualValue] = useState(() => params.get("id") || params.get("productId") || "");
  const [product, setProduct] = useState(null);
  const [solanaProof, setSolanaProof] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const blockchainStatus = useMemo(() => {
    if (!product) return "Not Checked";
    if (solanaProof?.verified) return "Solana Verified";
    if (solanaProof?.proofExists && solanaProof?.hashMatch === false) return "Hash Mismatch";
    if (solanaProof?.proofExists) return "Proof Found";
    if (product?.blockchainSignature) return "Signature Found";
    if (isProductVerifiedForMarketplace(product)) return "System verified";
    return "Proof Not Submitted";
  }, [product, solanaProof]);

  const inventory = useMemo(() => {
    if (!product) return { quantityAvailable: 0, unitType: "units", status: "unknown", purchaseCount: 0 };
    const quantityAvailable = Number.isFinite(Number(product.quantityAvailable))
      ? Math.max(0, Math.floor(Number(product.quantityAvailable)))
      : Math.max(0, Math.floor(Number(String(product.quantity || "").replace(/[^\d.]/g, "")) || 0));
    const unitType = product.unitType || "units";
    const purchaseCount = product.purchases?.length || 0;
    const status = quantityAvailable > 0 ? "available" : "sold_out";
    return { quantityAvailable, unitType, status, purchaseCount };
  }, [product]);

  const loadProduct = async (productId) => {
    if (!productId) return;
    setLoading(true);
    setError("");
    try {
      const item = await getProductById(productId);
      if (!item) {
        setProduct(null);
        setSolanaProof(null);
        setError("Product not found. Check QR code and try again.");
      } else {
        setProduct(item);
        const proof = await verifySolanaProof({
          productId: item.id,
          expectedCropHashHex: item.cropHash,
        });
        setSolanaProof(proof);
      }
    } catch {
      setProduct(null);
      setSolanaProof(null);
      setError("Could not fetch product record.");
    } finally {
      setLoading(false);
    }
  };

  const queryLookupRaw = params.get("id") || params.get("productId") || "";
  useEffect(() => {
    const productId = getProductIdFromQr(queryLookupRaw.trim());
    if (productId) loadProduct(productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when route query changes; loadProduct only reads stable deps
  }, [queryLookupRaw]);

  const onScan = (results) => {
    const value = results?.[0]?.rawValue;
    if (!value) return;
    const productId = getProductIdFromQr(value);
    setManualValue(productId);
    loadProduct(productId);
  };

  const onImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!("BarcodeDetector" in window)) {
      setError("Image QR decode not supported in this browser.");
      return;
    }
    const bitmap = await createImageBitmap(file);
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const results = await detector.detect(bitmap);
    const value = results?.[0]?.rawValue || "";
    const productId = getProductIdFromQr(value);
    setManualValue(productId);
    loadProduct(productId);
  };

  return (
    <main className="min-h-screen min-w-0 bg-slate-950 px-4 py-8 pb-24 text-slate-100 sm:pb-8">
      <div className="mx-auto max-w-5xl min-w-0 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="min-w-0 text-xl font-bold text-white sm:text-2xl">Buyer QR Scanner</h1>
          <Link to="/marketplace" className="text-sm text-emerald-300 hover:text-emerald-200">
            Marketplace
          </Link>
        </div>

        <section className="grid gap-5 lg:grid-cols-[1.1fr,1fr]">
          <div className="glass max-w-full overflow-hidden rounded-2xl p-4">
            <p className="mb-3 inline-flex items-center gap-2 text-sm text-slate-300">
              <Camera className="h-4 w-4 shrink-0 text-emerald-300" />
              Camera Scanner
            </p>
            <div className="max-h-[min(420px,65vh)] w-full overflow-hidden [&_video]:h-auto [&_video]:max-h-[min(420px,65vh)] [&_video]:w-full [&_video]:object-cover">
              <Scanner onScan={onScan} constraints={{ facingMode: "environment" }} formats={["qr_code"]} />
            </div>
          </div>

          <div className="glass rounded-2xl p-4 space-y-3">
            <h2 className="text-base font-semibold text-white">Lookup Product</h2>
            <input value={manualValue} onChange={(e) => setManualValue(e.target.value)} placeholder="Paste product ID or QR URL" className="w-full rounded-xl bg-slate-900 p-3 text-sm" />
            <button onClick={() => loadProduct(getProductIdFromQr(manualValue))} className="rounded-xl border border-emerald-300/40 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10">
              Verify Product
            </button>
            <label className="block rounded-xl border border-dashed border-slate-500 p-3 text-xs text-slate-300">
              <span className="mb-2 inline-flex items-center gap-1">
                <ImageUp className="h-3.5 w-3.5" />
                Upload QR image
              </span>
              <input type="file" accept="image/*" onChange={onImageUpload} className="mt-1 block w-full text-xs" />
            </label>
            {loading && <p className="text-xs text-slate-400">Loading product...</p>}
            {!!error && (
              <p className="inline-flex items-center gap-1 text-xs text-rose-300">
                <TriangleAlert className="h-3.5 w-3.5" />
                {error}
              </p>
            )}
          </div>
        </section>

        {product ? (
          <section className="glass rounded-2xl p-5">
            <h2 className="mb-3 text-lg font-semibold text-white">Product Traceability Result</h2>
            <div className="space-y-5">
              <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                <p>Crop name: <span className="text-white">{product.cropName}</span></p>
                <p>Quantity remaining: <span className="text-white">{inventory.quantityAvailable} {inventory.unitType}</span></p>
                <p>Availability: <span className={inventory.status === "sold_out" ? "text-rose-200" : "text-emerald-200"}>{inventory.status === "sold_out" ? "Sold Out" : "Available"}</span></p>
                <p>Purchase history count: <span className="text-white">{inventory.purchaseCount}</span></p>
                <p>Product ID: <span className="font-mono text-white">{product.id}</span></p>
                <p>Harvest date: <span className="text-white">{new Date(product.createdAtIso || Date.now()).toLocaleString()}</span></p>
              </div>

              <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 p-4">
                <h3 className="text-base font-semibold text-white">Farmer Information</h3>
                <p className="mt-1 text-xs text-emerald-200/90">
                  Tap any field below to buy this product on the marketplace.
                </p>
                <div className="mt-2 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
                  <Link
                    to={`/marketplace?productId=${encodeURIComponent(product.id)}`}
                    className="rounded-lg border border-transparent px-2 py-1.5 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                  >
                    Farmer name: <span className="text-white">{product?.farmerProfile?.farmerName || "Not provided"}</span>
                  </Link>
                  <Link
                    to={`/marketplace?productId=${encodeURIComponent(product.id)}`}
                    className="rounded-lg border border-transparent px-2 py-1.5 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                  >
                    Farm name: <span className="text-white">{product?.farmerProfile?.farmName || "Not provided"}</span>
                  </Link>
                  <Link
                    to={`/marketplace?productId=${encodeURIComponent(product.id)}`}
                    className="rounded-lg border border-transparent px-2 py-1.5 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                  >
                    Province: <span className="text-white">{product?.farmerProfile?.province || "Not provided"}</span>
                  </Link>
                  <Link
                    to={`/marketplace?productId=${encodeURIComponent(product.id)}`}
                    className="rounded-lg border border-transparent px-2 py-1.5 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                  >
                    District: <span className="text-white">{product?.farmerProfile?.district || "Not provided"}</span>
                  </Link>
                  <Link
                    to={`/marketplace?productId=${encodeURIComponent(product.id)}`}
                    className="rounded-lg border border-transparent px-2 py-1.5 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                  >
                    Phone number: <span className="text-white">{product?.farmerProfile?.phoneNumber || "Not provided"}</span>
                  </Link>
                  <Link
                    to={`/marketplace?productId=${encodeURIComponent(product.id)}`}
                    className="rounded-lg border border-transparent px-2 py-1.5 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                  >
                    Crop specialization: <span className="text-white">{product?.farmerProfile?.cropSpecialization || "Not provided"}</span>
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-4 text-sm text-slate-200">
                <h3 className="mb-2 text-base font-semibold text-white">Verification Details</h3>
                <p className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  Solana verification: <span className="text-white">{blockchainStatus}</span>
                </p>
                <p className="mt-1">Wallet verified: <span className="text-white">{solanaProof?.wallet ? "Yes" : "No"}</span></p>
                <p className="mt-1">Timestamp verified: <span className="text-white">{solanaProof?.timestampIso ? "Yes" : "No"}</span></p>
                <p className="mt-1 break-words">Farmer wallet:{" "}<span className="break-all font-mono text-white">{product.walletAddress}</span></p>
                {solanaProof?.timestampIso ? <p className="mt-1">Blockchain timestamp: <span className="text-white">{new Date(solanaProof.timestampIso).toLocaleString()}</span></p> : null}
                {product.blockchainExplorerUrl ? (
                  <a href={product.blockchainExplorerUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-cyan-200 hover:text-cyan-100">
                    View Solana transaction
                  </a>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
