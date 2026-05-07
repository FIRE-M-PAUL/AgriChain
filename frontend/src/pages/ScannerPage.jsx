import { useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import MainLayout from "../layouts/MainLayout";
import Card from "../components/Card";
import BrandLogo from "../components/BrandLogo";

export default function ScannerPage() {
  const navigate = useNavigate();

  const onResult = (results) => {
    if (!results?.length || !results[0]?.rawValue) return;
    try {
      const url = new URL(results[0].rawValue);
      const parts = url.pathname.split("/");
      const productId = parts[parts.length - 1] || parts[parts.length - 2];
      if (productId) navigate(`/products/${productId}`);
    } catch {
      // Ignore invalid QR text values
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-xl">
        <Card className="space-y-4">
          <BrandLogo size="sm" showTagline />
          <h2 className="text-2xl font-bold">Scan QR Code</h2>
          <p className="text-sm text-slate-300">Use your camera to scan an AGRICHAIN product QR.</p>
          <div className="overflow-hidden rounded-xl">
            <Scanner
              onScan={onResult}
              constraints={{ facingMode: "environment" }}
              formats={["qr_code"]}
            />
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
