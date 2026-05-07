import { useMemo } from "react";
import { Activity, ShieldCheck, TriangleAlert, UsersRound } from "lucide-react";
import Card from "../components/Card";
import BuyerPageScaffold from "../components/BuyerPageScaffold";
import AnalyticsCard from "../components/dashboard/AnalyticsCard";
import { getBuyerScanHistory } from "../utils/buyer";

export default function BuyerAnalyticsPage() {
  const scans = getBuyerScanHistory();

  const metrics = useMemo(() => {
    const verified = scans.filter((s) => s.status === "verified").length;
    const warnings = scans.filter((s) => s.status === "warning").length;
    const aiVerified = scans.filter((s) => s.ai_verified).length;
    const trustedFarmers = new Set(scans.filter((s) => s.farmer_wallet).map((s) => s.farmer_wallet)).size;
    return { total: scans.length, verified, warnings, aiVerified, trustedFarmers };
  }, [scans]);

  const safeRate = metrics.total ? Math.round((metrics.verified / metrics.total) * 100) : 0;
  const aiRate = metrics.total ? Math.round((metrics.aiVerified / metrics.total) * 100) : 0;
  const recent = scans.slice(0, 7).reverse();

  return (
    <BuyerPageScaffold title="Buyer Analytics" subtitle="Deep visibility into scans, verified products, fraud detections, trusted farmer interactions, and AI verification trends.">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsCard title="Number of Scans" value={metrics.total} subtitle="Total verification attempts" icon={Activity} />
        <AnalyticsCard title="Verified Products" value={metrics.verified} subtitle="Passed authenticity checks" icon={ShieldCheck} />
        <AnalyticsCard title="Fraud Detections" value={metrics.warnings} subtitle="Warnings and anomalies" icon={TriangleAlert} />
        <AnalyticsCard title="Trusted Farmers" value={metrics.trustedFarmers} subtitle="Verified farmer interactions" icon={UsersRound} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-white">Verification Performance</h3>
          <div className="mt-4 space-y-4 text-sm text-slate-300">
            <div>
              <p className="mb-1">Successful verification rate</p>
              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${safeRate}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{safeRate}%</p>
            </div>
            <div>
              <p className="mb-1">AI verification trend</p>
              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-cyan-400" style={{ width: `${aiRate}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{aiRate}%</p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white">Verification Trend (Recent Scans)</h3>
          <div className="mt-4 flex h-36 items-end gap-2">
            {recent.map((item) => (
              <div key={`${item.product_id}-${item.scanned_at}`} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t ${item.status === "verified" ? "bg-emerald-400" : "bg-rose-400"}`}
                  style={{ height: item.status === "verified" ? "100%" : "55%" }}
                />
                <p className="max-w-full truncate text-[10px] text-slate-400">{item.product_id}</p>
              </div>
            ))}
            {!recent.length && <p className="text-sm text-slate-400">Insufficient scan history for trend chart.</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-white">Fraud Detection History</h3>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            {scans
              .filter((item) => item.status === "warning")
              .slice(0, 8)
              .map((item) => (
                <p key={`${item.product_id}-${item.scanned_at}`} className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2">
                  Warning on {item.product_id} at {new Date(item.scanned_at).toLocaleString()}
                </p>
              ))}
            {!metrics.warnings && <p className="text-slate-400">No warnings detected yet.</p>}
          </div>
        </Card>
      </div>
    </BuyerPageScaffold>
  );
}
