import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Wallet } from "lucide-react";
import { ReactQRCode, canRenderReactQRCode } from "../../lib/reactQrCode";
import { MOCK_SOLANA_WALLET } from "./paymentConstants";
import { simulateSolanaPayment } from "../../services/mockPaymentApi";

/** Solana checkout: simulated wallet UI, copy + QR for demo. */
export default function CheckoutSolana({
  amountSol,
  scenario,
  isLight,
  disabled,
  onSuccess,
  onError,
  onBusy,
}) {
  const [connected, setConnected] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | confirming | done
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    onBusy?.(phase === "confirming");
    return () => onBusy?.(false);
  }, [phase, onBusy]);

  const qrValue = JSON.stringify({
    simulation: true,
    network: "Solana-dev-sim",
    to: MOCK_SOLANA_WALLET,
    amountSol,
  });

  const copyWallet = async () => {
    try {
      await navigator.clipboard.writeText(MOCK_SOLANA_WALLET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError?.("Unable to copy to clipboard.");
    }
  };

  const handleConfirm = async () => {
    if (!connected || disabled) return;
    setPhase("confirming");
    try {
      const receipt = await simulateSolanaPayment({ amountSol, scenario });
      setPhase("done");
      await onSuccess?.(receipt);
    } catch (e) {
      setPhase("idle");
      onError?.(e.message || "Payment failed.");
    }
  };

  const label = isLight ? "text-slate-600" : "text-slate-300";
  const muted = isLight ? "text-slate-500" : "text-slate-400";

  return (
    <div className="space-y-4">
      <div>
        <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Wallet address</p>
        <div
          className={`mt-1 flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-xs ${
            isLight ? "border-slate-200 bg-slate-50 text-slate-800" : "border-slate-600 bg-slate-950/50 text-emerald-200"
          }`}
        >
          <span className="flex-1 break-all">{MOCK_SOLANA_WALLET}</span>
          <button
            type="button"
            onClick={copyWallet}
            className="rounded-lg border border-emerald-400/30 p-1.5 text-emerald-300 hover:bg-emerald-400/10"
            aria-label="Copy wallet address"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Amount (simulated)</p>
          <p className={`text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
            {Number(amountSol).toFixed(4)} <span className="text-emerald-400">SOL</span>
          </p>
        </div>
        <div className={`rounded-xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-slate-600 bg-black/40"}`}>
          {canRenderReactQRCode() ? (
            <ReactQRCode value={qrValue} size={88} bgColor={isLight ? "#ffffff" : "#0f172a"} fgColor="#10b981" />
          ) : (
            <span className={`text-[10px] ${muted}`}>QR unavailable</span>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "confirming" && (
          <motion.div
            key="pulse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${isLight ? "bg-emerald-50 text-emerald-900" : "bg-emerald-500/15 text-emerald-200"}`}
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />
            Confirming on simulated blockchain…
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={disabled || phase === "confirming"}
          onClick={() => setConnected(true)}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
            connected
              ? "border-emerald-500 bg-emerald-500/15 text-emerald-200"
              : isLight
                ? "border-slate-300 bg-white hover:border-emerald-400"
                : "border-slate-500 bg-slate-800 hover:border-emerald-400"
          }`}
        >
          <Wallet className="h-4 w-4" />
          {connected ? "Wallet Connected" : "Connect Wallet"}
        </button>
        <button
          type="button"
          disabled={!connected || disabled || phase === "confirming"}
          onClick={handleConfirm}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 transition disabled:opacity-50 ${
            phase === "confirming" ? "animate-pulse bg-emerald-400" : "bg-emerald-500 hover:bg-emerald-400"
          }`}
        >
          {phase === "confirming" ? "Processing…" : "Confirm Payment"}
        </button>
      </div>

      <p className={`text-[11px] ${label}`}>
        This is a front-end simulation. No real SOL is transferred.
      </p>
    </div>
  );
}
