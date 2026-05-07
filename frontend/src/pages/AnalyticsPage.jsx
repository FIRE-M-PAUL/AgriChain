import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Award, BarChart3, QrCode, ShieldCheck } from "lucide-react";
import Card from "../components/Card";
import AnalyticsCard from "../components/dashboard/AnalyticsCard";
import PageScaffold from "../components/PageScaffold";
import { productService } from "../services/api";

export default function AnalyticsPage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    productService
      .list()
      .then((res) => setProducts(res.data))
      .catch(() => toast.error("Could not load analytics"));
  }, []);

  const metrics = useMemo(() => {
    const total = products.length;
    const scans = products.reduce((sum, item) => sum + (item.scan_count || 0), 0);
    const aiVerified = products.filter((item) => item.ai_status === "verified").length;
    const chainVerified = products.filter((item) => item.blockchain_status === "verified").length;
    const repScore = total ? Math.min(100, Math.round((aiVerified + chainVerified + scans) * 4)) : 0;
    return { total, scans, aiVerified, chainVerified, repScore };
  }, [products]);

  const trendRows = useMemo(() => {
    if (!products.length) return [];
    return products.slice(0, 6).map((item) => ({
      label: item.crop_name,
      value: item.scan_count || 0,
    }));
  }, [products]);
  const maxTrend = Math.max(...trendRows.map((row) => row.value), 1);

  return (
    <PageScaffold title="Analytics" subtitle="Monitor product metrics, verification performance, scan behavior, and decentralized trust indicators.">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsCard title="Total Products" value={metrics.total} subtitle="Registered batches" icon={BarChart3} />
        <AnalyticsCard title="QR Scans" value={metrics.scans} subtitle="Buyer verification scans" icon={QrCode} />
        <AnalyticsCard title="AI Verified" value={metrics.aiVerified} subtitle="AI trust confirmations" icon={ShieldCheck} />
        <AnalyticsCard title="Reputation Score" value={`${metrics.repScore}%`} subtitle="Farmer trust rank" icon={Award} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
        <Card>
          <h3 className="text-lg font-semibold text-white">Product Trend (by scans)</h3>
          <div className="mt-4 space-y-3">
            {trendRows.length === 0 ? (
              <p className="text-sm text-slate-400">No trend data yet.</p>
            ) : (
              trendRows.map((row) => (
                <div key={`${row.label}-${row.value}`}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                    <span>{row.label}</span>
                    <span>{row.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${Math.round((row.value / maxTrend) * 100)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white">Verification Metrics</h3>
          <div className="mt-4 space-y-4 text-sm text-slate-300">
            <div>
              <p className="mb-1">AI verification completion</p>
              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${metrics.total ? Math.round((metrics.aiVerified / metrics.total) * 100) : 0}%` }} />
              </div>
            </div>
            <div>
              <p className="mb-1">Blockchain verification completion</p>
              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-cyan-400" style={{ width: `${metrics.total ? Math.round((metrics.chainVerified / metrics.total) * 100) : 0}%` }} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageScaffold>
  );
}
