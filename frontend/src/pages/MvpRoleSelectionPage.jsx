import { Link, useNavigate } from "react-router-dom";
import { Store, Tractor } from "lucide-react";
import toast from "react-hot-toast";
import { getStoredWalletAddress, setStoredRole } from "../services/walletSession";

export default function MvpRoleSelectionPage() {
  const navigate = useNavigate();
  const wallet = getStoredWalletAddress();

  const chooseRole = (role) => {
    if (!wallet) {
      toast.error("Connect Phantom wallet first.");
      navigate("/");
      return;
    }
    setStoredRole(role);
    navigate(role === "farmer" ? "/farmer" : "/marketplace");
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-center text-3xl font-bold text-white">Choose Your Role</h1>
        <p className="text-center text-sm text-slate-300">
          Wallet identity: <span className="font-mono">{wallet}</span>
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => chooseRole("farmer")}
            className="glass rounded-2xl p-6 text-left hover:border-emerald-300/40"
          >
            <Tractor className="mb-3 h-6 w-6 text-emerald-300" />
            <h2 className="text-lg font-semibold text-white">I am a Farmer</h2>
            <p className="mt-1 text-sm text-slate-300">Set up your profile, record crops, and generate verified QR proofs.</p>
          </button>
          <button
            type="button"
            onClick={() => chooseRole("buyer")}
            className="glass rounded-2xl p-6 text-left hover:border-cyan-300/40"
          >
            <Store className="mb-3 h-6 w-6 text-cyan-300" />
            <h2 className="text-lg font-semibold text-white">I am a Buyer</h2>
            <p className="mt-1 text-sm text-slate-300">Browse trusted products, pay with Solana, and verify proof-of-origin.</p>
          </button>
        </div>
        <div className="text-center">
          <Link to="/" className="text-sm text-emerald-300 hover:text-emerald-200">
            Back to landing
          </Link>
        </div>
      </div>
    </main>
  );
}
