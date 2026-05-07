import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import Card from "../components/Card";
import PageScaffold from "../components/PageScaffold";
import StatusBadge from "../components/dashboard/StatusBadge";

export default function ScanProductPage() {
  const navigate = useNavigate();
  const [lastScan, setLastScan] = useState(null);

  const onResult = (results) => {
    if (!results?.length || !results[0]?.rawValue) return;
    try {
      const url = new URL(results[0].rawValue);
      const parts = url.pathname.split("/");
      const productId = parts[parts.length - 1] || parts[parts.length - 2];
      setLastScan({ productId, source: results[0].rawValue });
      if (productId) navigate(`/products/${productId}`);
    } catch {
      setLastScan({ productId: null, source: results[0].rawValue });
    }
  };

  return (
    <PageScaffold title="Scan Product" subtitle="Use camera QR scanning to instantly verify product authenticity, AI checks, and blockchain proofs.">
      <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
        <Card className="overflow-hidden">
          <Scanner onScan={onResult} constraints={{ facingMode: "environment" }} formats={["qr_code"]} />
        </Card>

        <Card className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Verification Panel</h3>
          <div className="flex gap-2">
            <StatusBadge label="AI Verified" />
            <StatusBadge label="Blockchain Verified" />
          </div>
          {lastScan ? (
            <div className="space-y-2 text-sm text-slate-300">
              <p>Last scan source: {lastScan.source}</p>
              <p>Product: {lastScan.productId || "Unknown"}</p>
              <p>Farmer reputation: Trusted Grower</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Scan a product QR code to display authenticity details.</p>
          )}
        </Card>
      </div>
    </PageScaffold>
  );
}
