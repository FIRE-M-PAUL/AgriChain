import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink, ShieldCheck, Sparkles, TriangleAlert, UserRoundCheck } from "lucide-react";
import Card from "../components/Card";
import BuyerPageScaffold from "../components/BuyerPageScaffold";
import StatusBadge from "../components/dashboard/StatusBadge";
import { productService } from "../services/api";
import { addBuyerScan, deriveVerificationInsights, getSavedProducts, toggleSavedProduct } from "../utils/buyer";

export default function BuyerVerificationPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [saved, setSaved] = useState(getSavedProducts());

  useEffect(() => {
    productService
      .detail(productId)
      .then((res) => {
        const item = res.data;
        setProduct(item);
        const blockchainVerified = String(item.blockchain_status || "").toLowerCase().includes("verify");
        const aiVerified = String(item.ai_status || "").toLowerCase().includes("verify");
        addBuyerScan({
          product_id: item.unique_code || productId,
          farmer_wallet: item.farmer_wallet,
          status: blockchainVerified && aiVerified ? "verified" : "warning",
          ai_verified: aiVerified,
          blockchain_verified: blockchainVerified,
        });
      })
      .catch(() => setProduct(null));
  }, [productId]);

  const verification = useMemo(() => deriveVerificationInsights(product), [product]);

  if (!product) {
    return (
      <BuyerPageScaffold title="Verification Center" subtitle="Product authenticity proof and verification intelligence.">
        <Card>
          <p className="text-sm text-slate-300">Verification data could not be loaded for this product.</p>
        </Card>
      </BuyerPageScaffold>
    );
  }

  const timeline = ["Harvested", "AI Verified", "Blockchain Recorded", "Transported", "Delivered"];

  return (
    <BuyerPageScaffold title={`Verification: ${product.unique_code || productId}`} subtitle="Complete product proof: blockchain authenticity, AI confidence, and traceability timeline.">
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-white">Product Details</h3>
          <div className="mt-3 space-y-1 text-sm text-slate-300">
            <p>Product name: {product.crop_name}</p>
            <p>Crop type: {product.crop_name}</p>
            <p>Farmer name: {product.farmer_wallet ? "Verified Farmer" : "Unknown Farmer"}</p>
            <p>Farm location: On-chain source record</p>
            <p>Harvest date: {new Date(product.created_at).toLocaleDateString()}</p>
            <p>Product status: {product.lifecycle_status || "Recorded"}</p>
            <p>Verification timestamp: {new Date().toLocaleString()}</p>
          </div>
          <button
            className="mt-4 rounded-xl border border-cyan-300/40 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/10"
            onClick={() => setSaved(toggleSavedProduct(product.unique_code || productId))}
          >
            {saved.includes(product.unique_code || productId) ? "Remove Saved Product" : "Save Product"}
          </button>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white">Verification Badges</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge label={verification.blockchainVerified ? "Blockchain Verified" : "Blockchain Pending"} />
            <StatusBadge label={verification.aiVerified ? "AI Verified" : "AI Pending"} />
            <StatusBadge label={verification.verifiedFarmer ? "Verified Farmer" : "Unverified Farmer"} />
          </div>
          <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-slate-900/50 p-3 text-xs text-slate-300">
            <p className="flex items-center gap-2 text-cyan-200"><ShieldCheck className="h-3.5 w-3.5" /> Blockchain verification panel</p>
            <p>Transaction hash: {product.blockchain_tx || "Pending"}</p>
            <p>Smart contract status: {product.blockchain_status || "Pending"}</p>
            <p>Wallet owner: {product.farmer_wallet || "Unavailable"}</p>
            <p>Blockchain timestamp: {new Date(product.created_at).toLocaleString()}</p>
            <Link
              to={`https://explorer.solana.com/tx/${product.blockchain_tx || product.blockchain_hash || ""}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200"
            >
              View on Blockchain Explorer <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><Sparkles className="h-5 w-5 text-emerald-300" /> AI Verification</h3>
          <div className="mt-3 space-y-1 text-sm text-slate-300">
            <p>Crop detected: {product.crop_name}</p>
            <p>AI confidence: {Math.round(product.ai_confidence || 0)}%</p>
            <p>Authenticity score: {verification.authenticityScore}%</p>
            <p>Authenticity: {verification.authenticityLevel}</p>
            <p>Quality analysis: {verification.qualityLabel}</p>
            <p>AI summary: {product.ai_summary || "No additional AI notes"}</p>
          </div>
        </Card>

        <Card>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><UserRoundCheck className="h-5 w-5 text-cyan-300" /> Product Lifecycle Tracking</h3>
          <ol className="mt-4 space-y-2">
            {timeline.map((step, idx) => (
              <li key={step} className="flex items-center gap-3 text-sm text-slate-300">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${idx < 3 ? "bg-emerald-400" : "bg-slate-500"}`} />
                {step}
              </li>
            ))}
          </ol>
        </Card>
      </section>

      {!!verification.warnings.length && (
        <Card className="border border-rose-300/35 bg-rose-500/10">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <TriangleAlert className="h-5 w-5 text-rose-300" />
            Fraud Detection Warnings
          </h3>
          <ul className="mt-3 space-y-1 text-sm text-rose-100">
            {verification.warnings.map((warning) => (
              <li key={warning}>- {warning}</li>
            ))}
          </ul>
        </Card>
      )}
    </BuyerPageScaffold>
  );
}
