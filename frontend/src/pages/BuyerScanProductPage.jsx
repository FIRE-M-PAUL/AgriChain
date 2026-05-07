import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, ImageUp, ShieldCheck, TriangleAlert } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import Card from "../components/Card";
import BuyerPageScaffold from "../components/BuyerPageScaffold";
import { productService } from "../services/api";
import StatusBadge from "../components/dashboard/StatusBadge";
import { deriveVerificationInsights } from "../utils/buyer";

function extractProductId(rawValue = "") {
  try {
    const url = new URL(rawValue);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    return rawValue.trim();
  }
}

export default function BuyerScanProductPage() {
  const navigate = useNavigate();
  const [scanError, setScanError] = useState("");
  const [manualQr, setManualQr] = useState("");
  const [lastDecoded, setLastDecoded] = useState("");
  const [loadingVerification, setLoadingVerification] = useState(false);
  const [verificationPreview, setVerificationPreview] = useState(null);

  const lastProductId = useMemo(() => extractProductId(lastDecoded), [lastDecoded]);

  const onScan = (results) => {
    const value = results?.[0]?.rawValue;
    if (!value) return;
    setLastDecoded(value);
    const productId = extractProductId(value);
    if (productId) fetchPreview(productId);
  };

  const fetchPreview = async (productId) => {
    if (!productId) {
      setScanError("Missing product ID in QR.");
      return;
    }
    setLoadingVerification(true);
    setScanError("");
    try {
      const res = await productService.detail(productId);
      const product = res.data;
      const insights = deriveVerificationInsights(product);
      setVerificationPreview({ product, insights });
    } catch (error) {
      setVerificationPreview(null);
      setScanError(error?.response?.data?.detail || "Failed to fetch product verification data.");
    } finally {
      setLoadingVerification(false);
    }
  };

  const onImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setScanError("");
    try {
      if (!("BarcodeDetector" in window)) {
        throw new Error("Image decoding not supported by this browser. Use camera scan or paste QR URL.");
      }
      const bitmap = await createImageBitmap(file);
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const results = await detector.detect(bitmap);
      const value = results?.[0]?.rawValue || "";
      if (!value) throw new Error("No QR code detected in image.");
      setLastDecoded(value);
      const productId = extractProductId(value);
      if (productId) fetchPreview(productId);
    } catch (error) {
      setScanError(error.message || "Could not decode uploaded QR image.");
    }
  };

  return (
    <BuyerPageScaffold title="Scan Product" subtitle="Camera and image-based QR scanning for real-time authenticity verification and fraud detection.">
      <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
        <Card className="overflow-hidden">
          <p className="mb-3 flex items-center gap-2 text-sm text-slate-300">
            <Camera className="h-4 w-4 text-cyan-300" />
            Live Camera Scanner
          </p>
          <Scanner onScan={onScan} constraints={{ facingMode: "environment" }} formats={["qr_code"]} />
        </Card>

        <Card className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Verification Output</h3>
          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3 text-sm text-slate-300">
            {lastProductId ? (
              <>
                <p>Product ID: {lastProductId}</p>
                <p className="mt-1 text-cyan-200">
                  {loadingVerification ? "Fetching blockchain and AI verification data..." : "Scan captured. Verification preview ready."}
                </p>
              </>
            ) : (
              <p>Scan a QR code to fetch product details.</p>
            )}
          </div>
          {verificationPreview?.product ? (
            <div className="rounded-xl border border-cyan-300/25 bg-cyan-500/10 p-3 text-xs text-slate-200">
              <div className="mb-2 flex flex-wrap gap-2">
                <StatusBadge label={verificationPreview.insights.blockchainVerified ? "Blockchain Verified" : "Blockchain Pending"} />
                <StatusBadge label={verificationPreview.insights.aiVerified ? "AI Verified" : "AI Warning"} />
                <StatusBadge label={verificationPreview.insights.verifiedFarmer ? "Verified Farmer" : "Unverified Farmer"} />
              </div>
              <p>Product name: {verificationPreview.product.crop_name}</p>
              <p>Crop type: {verificationPreview.product.crop_name}</p>
              <p>Farmer name: {verificationPreview.product.farmer_wallet ? "Verified Farmer" : "Unknown Farmer"}</p>
              <p>Farm location: On-chain record</p>
              <p>Harvest date: {new Date(verificationPreview.product.created_at).toLocaleDateString()}</p>
              <p>Product status: {verificationPreview.product.lifecycle_status || "recorded"}</p>
              <button
                className="mt-3 rounded-lg border border-cyan-300/40 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-400/10"
                onClick={() => navigate(`/buyer/verification/${verificationPreview.product.unique_code || lastProductId}`)}
              >
                Open Full Verification
              </button>
            </div>
          ) : null}
          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
            <p className="mb-2 flex items-center gap-2 text-sm text-slate-300">
              <ImageUp className="h-4 w-4 text-cyan-300" />
              Upload QR Image
            </p>
            <input type="file" accept="image/*" className="w-full text-xs text-slate-300" onChange={onImageUpload} />
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Manual QR URL / Code</p>
            <input
              className="w-full rounded-lg bg-slate-950 p-2 text-sm"
              placeholder="Paste QR URL or product code"
              value={manualQr}
              onChange={(e) => setManualQr(e.target.value)}
            />
            <button
              className="mt-2 rounded-lg border border-cyan-300/40 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/10"
              onClick={() => fetchPreview(extractProductId(manualQr))}
            >
              Verify Now
            </button>
          </div>
          {!!scanError && (
            <p className="flex items-center gap-1 text-xs text-rose-300">
              <TriangleAlert className="h-3.5 w-3.5" />
              {scanError}
            </p>
          )}
          <p className="flex items-center gap-2 text-xs text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Mobile scanning optimized with rear camera preference.
          </p>
        </Card>
      </div>
    </BuyerPageScaffold>
  );
}
