import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import BuyerPageScaffold from "../components/BuyerPageScaffold";
import StatusBadge from "../components/dashboard/StatusBadge";
import { productService } from "../services/api";
import { getSavedFarmers, toggleSavedFarmer } from "../utils/buyer";

export default function BuyerTrustedFarmersPage() {
  const [products, setProducts] = useState([]);
  const [savedFarmers, setSavedFarmers] = useState(getSavedFarmers());

  useEffect(() => {
    productService.list().then((res) => setProducts(res.data || [])).catch(() => setProducts([]));
  }, []);

  const farmers = useMemo(() => {
    const grouped = new Map();
    products.forEach((item) => {
      const wallet = item.farmer_wallet || "unknown_farmer";
      const current = grouped.get(wallet) || { wallet, products: 0, aiVerified: 0, chainVerified: 0, scans: 0 };
      current.products += 1;
      current.scans += Number(item.scan_count || 0);
      if (String(item.ai_status || "").toLowerCase().includes("verify")) current.aiVerified += 1;
      if (String(item.blockchain_status || "").toLowerCase().includes("verify")) current.chainVerified += 1;
      grouped.set(wallet, current);
    });
    return [...grouped.values()].map((farmer) => {
      const trustScore = farmer.products ? Math.round(((farmer.aiVerified + farmer.chainVerified) / (farmer.products * 2)) * 100) : 0;
      return {
        ...farmer,
        trustScore,
        verificationLevel: trustScore >= 90 ? "Platinum" : trustScore >= 75 ? "Gold" : "Standard",
        buyerTrust: Math.min(99, Math.round((trustScore + farmer.scans) / 2)),
      };
    });
  }, [products]);

  return (
    <BuyerPageScaffold title="Trusted Farmers" subtitle="Verified and reputable farmers ranked by AI and blockchain-backed trust indicators.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {farmers.map((farmer) => (
          <Card key={farmer.wallet}>
            <p className="font-mono text-xs text-slate-400">{farmer.wallet}</p>
            <p className="mt-2 text-sm text-slate-300">Farmer Trust Score: {farmer.trustScore}%</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge label={farmer.verificationLevel} />
              <StatusBadge label={`${farmer.products} Products`} />
            </div>
            <div className="mt-3 space-y-1 text-xs text-slate-300">
              <p>Verification percentage: {farmer.trustScore}%</p>
              <p>Products registered: {farmer.products}</p>
              <p>Buyer trust percentage: {farmer.buyerTrust}%</p>
              <div className="h-1.5 rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-cyan-400" style={{ width: `${farmer.trustScore}%` }} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className="rounded-lg border border-rose-300/40 px-2.5 py-1.5 text-xs text-rose-100 hover:bg-rose-500/10"
                onClick={() => setSavedFarmers(toggleSavedFarmer(farmer.wallet))}
              >
                <Heart className="mr-1 inline h-3.5 w-3.5" />
                {savedFarmers.includes(farmer.wallet) ? "Unsave Farmer" : "Save Favorite"}
              </button>
              <Link to={`/buyer/history?farmer=${farmer.wallet}`} className="rounded-lg border border-cyan-300/40 px-2.5 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/10">
                <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                View Profile
              </Link>
              <Link to={`/buyer/history?farmer=${farmer.wallet}`} className="rounded-lg border border-white/20 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10">
                View Products
              </Link>
            </div>
          </Card>
        ))}
      </div>
      {!farmers.length && (
        <Card>
          <p className="text-sm text-slate-400">No trusted farmers available yet. Verify products to build trusted farmer insights.</p>
        </Card>
      )}
    </BuyerPageScaffold>
  );
}
