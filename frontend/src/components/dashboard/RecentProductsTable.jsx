import { Download, Eye } from "lucide-react";
import StatusBadge from "./StatusBadge";

function shortId(value = "") {
  if (!value) return "-";
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

export default function RecentProductsTable({ products, onView, onDownloadQr }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="px-2 py-3">Product ID</th>
            <th className="px-2 py-3">Crop Name</th>
            <th className="px-2 py-3">Quantity</th>
            <th className="px-2 py-3">Status</th>
            <th className="px-2 py-3">AI Verification</th>
            <th className="px-2 py-3">Blockchain</th>
            <th className="px-2 py-3">QR Code</th>
            <th className="px-2 py-3">Created</th>
            <th className="px-2 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id || product.unique_code} className="border-t border-slate-700/60 text-slate-200">
              <td className="px-2 py-3 font-mono text-xs">{shortId(product.unique_code)}</td>
              <td className="px-2 py-3">{product.crop_name}</td>
              <td className="px-2 py-3">{product.quantity} kg</td>
              <td className="px-2 py-3">
                <StatusBadge label={product.delivery_status || "Recorded"} />
              </td>
              <td className="px-2 py-3">
                <StatusBadge label={product.ai_status || "Pending"} />
              </td>
              <td className="px-2 py-3">
                <StatusBadge label={product.blockchain_status || "Pending"} />
              </td>
              <td className="px-2 py-3">
                <span className="rounded-lg bg-slate-800 px-2 py-1 text-xs">Available</span>
              </td>
              <td className="px-2 py-3">{new Date(product.created_at).toLocaleDateString()}</td>
              <td className="px-2 py-3">
                <div className="flex items-center gap-2">
                  <button className="rounded-lg bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700" onClick={() => onView(product)}>
                    <Eye className="mr-1 inline h-3.5 w-3.5" />
                    View
                  </button>
                  <button className="rounded-lg bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/30" onClick={() => onDownloadQr(product)}>
                    <Download className="mr-1 inline h-3.5 w-3.5" />
                    QR
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
