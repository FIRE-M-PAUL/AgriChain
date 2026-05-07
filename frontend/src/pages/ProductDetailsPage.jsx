import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Card from "../components/Card";
import BrandLogo from "../components/BrandLogo";
import Loader from "../components/Loader";
import QRCode from "react-qr-code";
import { productService } from "../services/api";

export default function ProductDetailsPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await productService.detail(productId);
        setProduct(res.data);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  if (loading) {
    return (
      <MainLayout>
        <Loader />
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <Card className="space-y-3 text-center">
          <div className="flex justify-center">
            <BrandLogo size="md" compact />
          </div>
          <p>Product not found.</p>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Product Trace Details</h2>
            <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-300">
              Verified
            </span>
          </div>
          <div className="grid gap-3 text-slate-300">
            <p>
              <span className="text-slate-400">Crop:</span> {product.crop_name}
            </p>
            <p>
              <span className="text-slate-400">Description:</span> {product.description || "No description"}
            </p>
            <p>
              <span className="text-slate-400">Quantity:</span> {product.quantity} kg
            </p>
            <p>
              <span className="text-slate-400">Farmer Wallet:</span> {product.farmer_wallet}
            </p>
            <p>
              <span className="text-slate-400">Date Created:</span> {new Date(product.created_at).toLocaleString()}
            </p>
            <p>
              <span className="text-slate-400">Product ID:</span> {product.unique_code}
            </p>
            <p>
              <span className="text-slate-400">AI Verification:</span> {product.ai_status} ({Math.round(product.ai_confidence || 0)}%)
            </p>
            <p>
              <span className="text-slate-400">Blockchain:</span> {product.blockchain_status}
            </p>
            {product.blockchain_tx && (
              <p>
                <span className="text-slate-400">Transaction:</span> {product.blockchain_tx}
              </p>
            )}
          </div>
          <div className="w-fit rounded-xl bg-white p-3">
            <QRCode value={`${window.location.origin}/products/${product.unique_code}`} size={160} />
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
