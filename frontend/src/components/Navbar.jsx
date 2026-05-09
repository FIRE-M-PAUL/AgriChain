import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "./Button";
import BrandLogo from "./BrandLogo";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, walletAddress, connectWallet, disconnectWallet, isConnecting, walletError, role } = useAuth();
  const shortWallet = walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : "";
  const isLandingPage = location.pathname === "/";

  const onConnect = async () => {
    try {
      const result = await connectWallet();
      toast.success("Wallet connected");
      if (!result?.role) navigate("/onboarding");
      else navigate(result.role === "buyer" ? "/buyer/dashboard" : "/dashboard");
    } catch (error) {
      toast.error(error.message || "Wallet connection failed");
    }
  };

  const onDisconnect = async () => {
    await disconnectWallet();
    toast.success("Wallet disconnected");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="transition hover:opacity-90">
          <BrandLogo size="sm" showTagline />
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          <Link to="/scanner" className="text-sm text-slate-200 hover:text-white">
            Scan
          </Link>
          {!isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                className="rounded-xl border border-emerald-300/40 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={onConnect}
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting..." : "Phantom"}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">{shortWallet}</span>
              <button className="text-sm text-slate-200 hover:text-white" onClick={onDisconnect}>
                Disconnect
              </button>
            </div>
          )}
          {!isLandingPage && isAuthenticated && (
            <Link to={role === "buyer" ? "/buyer/dashboard" : "/dashboard"}>
              <Button className="px-4 py-2">{role === "buyer" ? "Buyer Panel" : "Dashboard"}</Button>
            </Link>
          )}
        </div>
      </nav>
      {!!walletError && !isAuthenticated && (
        <div className="mx-auto max-w-6xl px-4 pb-3 text-xs text-rose-300">{walletError}</div>
      )}
    </header>
  );
}
