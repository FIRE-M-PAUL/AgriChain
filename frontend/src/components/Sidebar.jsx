import { BarChart3, History, LayoutDashboard, QrCode, ScanLine, Sprout, Upload } from "lucide-react";
import { NavLink } from "react-router-dom";
import BrandLogo from "./BrandLogo";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/register-crop", label: "Register New Crop", icon: Sprout },
  { to: "/generate-qr", label: "Generate QR Code", icon: QrCode },
  { to: "/upload-crop-image", label: "Upload Crop Image", icon: Upload },
  { to: "/product-history", label: "Product History", icon: History },
  { to: "/scan-product", label: "Scan Product", icon: ScanLine },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar() {
  const navBaseClass =
    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition";

  return (
    <aside className="glass hidden h-fit rounded-2xl p-4 lg:block">
      <div className="mb-4 border-b border-white/10 pb-3">
        <BrandLogo size="sm" showTagline compact={false} />
      </div>
      <div className="space-y-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) =>
              `${navBaseClass} ${
                isActive
                  ? "border-emerald-300/35 bg-emerald-500/12 text-emerald-200 shadow-[0_0_20px_rgba(34,197,94,0.16)]"
                  : "border-white/10 bg-slate-900/55 text-slate-200 hover:border-emerald-300/30 hover:bg-slate-800/80 hover:text-white"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
