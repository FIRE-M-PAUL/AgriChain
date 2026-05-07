import { BarChart3, LayoutDashboard, ShieldCheck, History, UsersRound, ScanLine } from "lucide-react";
import { NavLink } from "react-router-dom";
import BrandLogo from "./BrandLogo";

const navItems = [
  { to: "/buyer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/buyer/scan-product", label: "Scan Product", icon: ScanLine },
  { to: "/buyer/verification-center", label: "Verification Center", icon: ShieldCheck },
  { to: "/buyer/history", label: "Product History", icon: History },
  { to: "/buyer/trusted-farmers", label: "Trusted Farmers", icon: UsersRound },
  { to: "/buyer/analytics", label: "Analytics", icon: BarChart3 },
];

export default function BuyerSidebar() {
  const navBaseClass = "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition";

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
                  ? "border-cyan-300/35 bg-cyan-500/12 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                  : "border-white/10 bg-slate-900/55 text-slate-200 hover:border-cyan-300/30 hover:bg-slate-800/80 hover:text-white"
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
