import { useEffect, useMemo, useState } from "react";
import { Eye, ShieldCheck, ScanLine, TriangleAlert, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import BuyerPageScaffold from "../components/BuyerPageScaffold";
import AnalyticsCard from "../components/dashboard/AnalyticsCard";
import StatusBadge from "../components/dashboard/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { productService } from "../services/api";
import { getBuyerScanHistory, getSavedProducts } from "../utils/buyer";

export default function BuyerDashboardPage() {
  const { walletAddress, profile } = useAuth();
  const [products, setProducts] = useState([]);
  const [scans, setScans] = useState([]);

  useEffect(() => {
    productService.list().then((res) => setProducts(res.data || [])).catch(() => setProducts([]));
    setScans(getBuyerScanHistory());
  }, []);

  const savedProducts = getSavedProducts();

  const metrics = useMemo(() => {
    const verified = scans.filter((s) => s.status === "verified").length;
    const aiVerified = scans.filter((s) => s.ai_verified).length;
    const trustedFarmers = new Set(scans.filter((s) => s.farmer_wallet).map((s) => s.farmer_wallet)).size;
    return {
      scans: scans.length,
      verified,
      trustedFarmers,
      aiVerified,
      fraudAlerts: scans.filter((s) => s.status === "warning").length,
    };
  }, [scans]);

  return (
    <BuyerPageScaffold
      title="Buyer Verification Dashboard"
      subtitle="Trust-first decentralized product verification with blockchain authenticity, AI analysis, and lifecycle transparency."
      rightSlot={<StatusBadge label={`Verification Level ${profile?.verification_level || 1}`} />}
    >
      <Card className="border border-white/10 bg-slate-900/45">
        <p className="text-xs uppercase tracking-wider text-cyan-300">Connected Wallet</p>
        <p className="mt-2 break-all text-sm text-slate-200">{walletAddress || "Not connected"}</p>
        <p className="mt-3 text-xs text-slate-400">
          Buyer verification status: {profile?.is_verified ? "Verified Buyer" : "Verification in progress"}
        </p>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsCard title="Products Verified" value={metrics.verified} subtitle="Authenticity checks completed" icon={ShieldCheck} />
        <AnalyticsCard title="QR Codes Scanned" value={metrics.scans} subtitle="Total buyer scan activity" icon={ScanLine} />
        <AnalyticsCard title="Trusted Farmers" value={metrics.trustedFarmers} subtitle="Verified farmer interactions" icon={UsersRound} />
        <AnalyticsCard title="AI Verified Products" value={metrics.aiVerified} subtitle="AI confidence-backed scans" icon={Eye} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-white">Recent Scan Activity</h3>
          <div className="mt-3 space-y-2">
            {scans.slice(0, 5).map((scan) => (
              <div key={`${scan.product_id}-${scan.scanned_at}`} className="rounded-xl border border-white/10 bg-slate-900/50 p-3 text-xs text-slate-300">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono">{scan.product_id}</span>
                  <StatusBadge label={scan.status || "pending"} />
                </div>
                <p className="mt-1">{new Date(scan.scanned_at).toLocaleString()}</p>
              </div>
            ))}
            {!scans.length && <p className="text-sm text-slate-400">No scans yet. Start by scanning a product QR code.</p>}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white">Verification Summary</h3>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            <p>Trusted products viewed: {savedProducts.length}</p>
            <p>Total products in network: {products.length}</p>
            <p>Fraud alerts generated: {metrics.fraudAlerts}</p>
            <p>Verified farmers interacted with: {metrics.trustedFarmers}</p>
          </div>
          <Link to="/buyer/scan-product" className="mt-4 inline-flex rounded-xl border border-cyan-300/40 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/10">
            Scan New Product
          </Link>
        </Card>
      </div>

      <Card className="border border-rose-300/30 bg-rose-500/10">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <TriangleAlert className="h-5 w-5 text-rose-300" />
          Fraud Alerts
        </h3>
        <p className="mt-2 text-sm text-rose-100">Warnings appear here for unverified farmers, AI mismatch, missing blockchain proofs, and duplicate QR detections.</p>
      </Card>
    </BuyerPageScaffold>
  );
}
