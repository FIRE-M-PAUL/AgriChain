import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Card from "../components/Card";
import PageScaffold from "../components/PageScaffold";
import StatusBadge from "../components/dashboard/StatusBadge";
import { productService } from "../services/api";

export default function ProductHistoryPage() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    productService
      .list()
      .then((res) => setProducts(res.data))
      .catch(() => toast.error("Could not load product history"));
  }, []);

  const filtered = useMemo(() => {
    return products.filter((item) => {
      const q = query.toLowerCase();
      const matchesQuery = !q || item.crop_name.toLowerCase().includes(q) || item.unique_code.toLowerCase().includes(q);
      const statusValue = (item.lifecycle_status || "").toLowerCase();
      const matchesStatus = statusFilter === "all" || statusValue === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [products, query, statusFilter]);

  return (
    <PageScaffold title="Product History" subtitle="Explore lifecycle history, verification states, and trackability signals for all batches.">
      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr,200px]">
          <input className="rounded-xl bg-slate-900 p-3 text-sm" placeholder="Search by crop or product ID..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="rounded-xl bg-slate-900 p-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="recorded">Recorded</option>
            <option value="verified">Verified</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400">No products matched your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-2 py-2">Product ID</th>
                  <th className="px-2 py-2">Crop</th>
                  <th className="px-2 py-2">Quantity</th>
                  <th className="px-2 py-2">AI</th>
                  <th className="px-2 py-2">Blockchain</th>
                  <th className="px-2 py-2">Created</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.unique_code} className="border-t border-slate-700/60 text-slate-200">
                    <td className="px-2 py-3 font-mono text-xs">{item.unique_code}</td>
                    <td className="px-2 py-3">{item.crop_name}</td>
                    <td className="px-2 py-3">{item.quantity} kg</td>
                    <td className="px-2 py-3">
                      <StatusBadge label={item.ai_status} />
                    </td>
                    <td className="px-2 py-3">
                      <StatusBadge label={item.blockchain_status} />
                    </td>
                    <td className="px-2 py-3">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="px-2 py-3">
                      <StatusBadge label={item.lifecycle_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageScaffold>
  );
}
