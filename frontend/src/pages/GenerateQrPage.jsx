import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Download, Printer, Share2 } from "lucide-react";
import { ReactQRCode, canRenderReactQRCode } from "../lib/reactQrCode";
import Card from "../components/Card";
import PageScaffold from "../components/PageScaffold";
import StatusBadge from "../components/dashboard/StatusBadge";
import { productService } from "../services/api";

export default function GenerateQrPage() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    productService
      .list()
      .then((res) => {
        setProducts(res.data);
        if (res.data[0]?.unique_code) setSelectedId(res.data[0].unique_code);
      })
      .catch(() => toast.error("Could not load products"));
  }, []);

  const selectedProduct = useMemo(() => products.find((item) => item.unique_code === selectedId), [products, selectedId]);
  const qrValue = selectedProduct ? `${window.location.origin}/products/${selectedProduct.unique_code}` : "";

  const copyShareLink = async () => {
    if (!qrValue) return;
    await navigator.clipboard.writeText(qrValue);
    toast.success("QR link copied");
  };

  return (
    <PageScaffold title="Generate QR Code" subtitle="Create traceable product QR labels with verification details and ready-to-share links.">
      <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
        <Card className="space-y-4">
          <label className="text-sm text-slate-300">Select Product</label>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full rounded-xl bg-slate-900 p-3 text-sm">
            {products.map((item) => (
              <option key={item.unique_code} value={item.unique_code}>
                {item.crop_name} • {item.unique_code}
              </option>
            ))}
          </select>

          {selectedProduct ? (
            <div className="space-y-2 text-sm">
              <p className="text-slate-300">Product: {selectedProduct.crop_name}</p>
              <p className="text-slate-300">Quantity: {selectedProduct.quantity} kg</p>
              <div className="flex gap-2">
                <StatusBadge label={selectedProduct.ai_status || "pending"} />
                <StatusBadge label={selectedProduct.blockchain_status || "pending"} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No products available yet.</p>
          )}
        </Card>

        <Card className="space-y-4 text-center">
          <div className="mx-auto w-fit rounded-xl bg-white p-3">
            {qrValue && canRenderReactQRCode() ? (
              <ReactQRCode value={qrValue} size={180} />
            ) : qrValue ? (
              <p className="text-xs text-slate-500">QR unavailable</p>
            ) : (
              <p className="text-xs text-slate-500">Select a product</p>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button className="rounded-xl border border-white/20 px-3 py-2 text-xs hover:bg-white/10">
              <Download className="mr-1 inline h-3.5 w-3.5" />
              Download
            </button>
            <button className="rounded-xl border border-white/20 px-3 py-2 text-xs hover:bg-white/10">
              <Printer className="mr-1 inline h-3.5 w-3.5" />
              Print
            </button>
            <button onClick={copyShareLink} className="rounded-xl border border-emerald-300/35 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-500/10">
              <Share2 className="mr-1 inline h-3.5 w-3.5" />
              Share
            </button>
          </div>
        </Card>
      </div>
    </PageScaffold>
  );
}
