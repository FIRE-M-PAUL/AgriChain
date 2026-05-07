import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Card from "../components/Card";
import BuyerPageScaffold from "../components/BuyerPageScaffold";
import StatusBadge from "../components/dashboard/StatusBadge";
import { getBuyerScanHistory, getSavedProducts } from "../utils/buyer";

export default function BuyerHistoryPage() {
  const [searchParams] = useSearchParams();
  const farmerFilter = searchParams.get("farmer");
  const scans = getBuyerScanHistory();
  const savedProducts = getSavedProducts();
  const filteredScans = farmerFilter ? scans.filter((item) => item.farmer_wallet === farmerFilter) : scans;

  const fraudAlerts = useMemo(() => filteredScans.filter((scan) => scan.status === "warning"), [filteredScans]);

  return (
    <BuyerPageScaffold title="Product History" subtitle="Track previous scans, verification outcomes, saved products, and fraud warnings.">
      <Card>
        <h3 className="text-lg font-semibold text-white">Previously Scanned Products</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">Product</th>
                <th className="px-2 py-2">Timestamp</th>
                <th className="px-2 py-2">AI</th>
                <th className="px-2 py-2">Blockchain</th>
                <th className="px-2 py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {filteredScans.map((scan) => (
                <tr key={`${scan.product_id}-${scan.scanned_at}`} className="border-t border-slate-700/60 text-slate-200">
                  <td className="px-2 py-3 font-mono text-xs">
                    <Link to={`/buyer/verification/${scan.product_id}`} className="text-cyan-300 hover:text-cyan-200">
                      {scan.product_id}
                    </Link>
                  </td>
                  <td className="px-2 py-3">{new Date(scan.scanned_at).toLocaleString()}</td>
                  <td className="px-2 py-3">
                    <StatusBadge label={scan.ai_verified ? "Verified" : "Warning"} />
                  </td>
                  <td className="px-2 py-3">
                    <StatusBadge label={scan.blockchain_verified ? "Verified" : "Warning"} />
                  </td>
                  <td className="px-2 py-3">
                    <StatusBadge label={scan.status || "pending"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredScans.length && <p className="py-3 text-sm text-slate-400">No history yet.</p>}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-white">Saved Products</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            {savedProducts.map((id) => (
              <p key={id} className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 font-mono text-xs">
                {id}
              </p>
            ))}
            {!savedProducts.length && <p className="text-slate-400">No saved products yet.</p>}
          </div>
        </Card>
        <Card className="border border-rose-300/30 bg-rose-500/10">
          <h3 className="text-lg font-semibold text-white">Fraud Alerts</h3>
          <div className="mt-3 space-y-2 text-sm text-rose-100">
            {fraudAlerts.map((alert) => (
              <p key={`${alert.product_id}-${alert.scanned_at}`}>- Potential risk detected for {alert.product_id}</p>
            ))}
            {!fraudAlerts.length && <p>No fraud alerts found.</p>}
          </div>
        </Card>
      </div>
    </BuyerPageScaffold>
  );
}
