import { Link } from "react-router-dom";
import Card from "./Card";

export default function ProductCard({ product }) {
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{product.crop_name}</h4>
        <span className="rounded-full bg-primary/20 px-3 py-1 text-xs text-primary">{product.quantity} kg</span>
      </div>
      <p className="text-xs text-slate-400">ID: {product.product_id || product.unique_code}</p>
      <Link className="text-sm text-emerald-300 hover:text-emerald-200" to={`/products/${product.unique_code}`}>
        View details
      </Link>
    </Card>
  );
}
