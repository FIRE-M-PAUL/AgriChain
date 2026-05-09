import { Wallet } from "lucide-react";

function shortenAddress(address = "") {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function PhantomConnectButton({ walletAddress, onConnect, className = "" }) {
  return (
    <button
      type="button"
      onClick={onConnect}
      className={`inline-flex items-center gap-2 rounded-xl border border-emerald-300/40 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10 ${className}`}
    >
      <Wallet className="h-4 w-4" />
      {walletAddress ? `Connected: ${shortenAddress(walletAddress)}` : "Connect Phantom Wallet"}
    </button>
  );
}
