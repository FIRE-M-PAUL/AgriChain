import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Loader2, Wallet, Droplets } from "lucide-react";
import { ReactQRCode, canRenderReactQRCode } from "../../lib/reactQrCode";
import { gateScenarioFailure, delay } from "../../services/mockPaymentApi";
import {
  simulateBuyerToFarmerTransfer,
  fetchWalletSolBalance,
  requestDevnetSolAirdrop,
} from "../../services/solanaProof";
import { explorerAddressUrl, showDevnetFaucetUi } from "../../services/solanaRpc";

const LAMPORTS_PER_SOL = 1_000_000_000;

function shorten(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

/** Solana checkout: RPC preflight + Phantom settles transfer after modal success → marketplace `buyProduct`. */
export default function CheckoutSolana({
  amountSol,
  scenario,
  isLight,
  disabled,
  buyerWallet,
  farmerWallet,
  onSuccess,
  onError,
  onBusy,
}) {
  const [phase, setPhase] = useState("idle"); // idle | simulating | done
  const [copied, setCopied] = useState(false);
  const [balanceSol, setBalanceSol] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [airdropBusy, setAirdropBusy] = useState(false);

  const lamports = Math.max(1, Math.round(Number(amountSol || 0) * LAMPORTS_PER_SOL));
  const walletConnected = Boolean(buyerWallet);
  const faucetVisible = showDevnetFaucetUi() && walletConnected;

  useEffect(() => {
    onBusy?.(phase === "simulating");
    return () => onBusy?.(false);
  }, [phase, onBusy]);

  useEffect(() => {
    let cancelled = false;
    if (!buyerWallet) {
      setBalanceSol(null);
      return undefined;
    }
    setBalanceLoading(true);
    fetchWalletSolBalance(buyerWallet)
      .then(({ sol }) => {
        if (!cancelled) setBalanceSol(sol);
      })
      .catch(() => {
        if (!cancelled) setBalanceSol(null);
      })
      .finally(() => {
        if (!cancelled) setBalanceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [buyerWallet]);

  const qrValue = JSON.stringify({
    agrichain: true,
    flow: "solana_transfer_preflight",
    farmer: farmerWallet || "",
    lamports,
    cluster: "configured_via_rpc",
  });

  const copyFarmer = async () => {
    if (!farmerWallet) return;
    try {
      await navigator.clipboard.writeText(farmerWallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError?.("Unable to copy to clipboard.");
    }
  };

  const handleAirdrop = async () => {
    if (!buyerWallet || airdropBusy) return;
    setAirdropBusy(true);
    try {
      await requestDevnetSolAirdrop(buyerWallet, 1);
      const { sol } = await fetchWalletSolBalance(buyerWallet);
      setBalanceSol(sol);
    } catch (e) {
      onError?.(e?.message || "Airdrop failed.");
    } finally {
      setAirdropBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!walletConnected || !farmerWallet || disabled) return;
    setPhase("simulating");
    try {
      await gateScenarioFailure(scenario, {
        insufficientFunds: "Insufficient SOL in simulated wallet.",
        invalidNumber: "Invalid transaction parameters.",
        timeout: "Network timeout — Solana RPC unavailable (simulated).",
        cancelled: "Transaction cancelled by user (simulated).",
      });
      await delay(400);

      const preflight = await simulateBuyerToFarmerTransfer({
        buyerWallet,
        farmerWallet,
        lamports,
      });
      if (!preflight.ok) {
        setPhase("idle");
        onError?.(preflight.error || "Transfer simulation failed.");
        return;
      }

      await delay(500);
      const receipt = {
        id: `sol_preflight_${Date.now()}`,
        method: "Solana",
        amountSol,
        confirmedAt: new Date().toISOString(),
        rpcPreflightOk: true,
      };
      setPhase("done");
      await onSuccess?.(receipt);
    } catch (e) {
      setPhase("idle");
      onError?.(e?.message || "Checkout validation failed.");
    }
  };

  const label = isLight ? "text-slate-600" : "text-slate-300";
  const muted = isLight ? "text-slate-500" : "text-slate-400";

  const lowBalance =
    balanceSol != null && balanceSol < Number(amountSol || 0) + 0.00005;

  return (
    <div className="space-y-4">
      <div>
        <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Farmer receiving wallet</p>
        <div
          className={`mt-1 flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-xs ${
            isLight ? "border-slate-200 bg-slate-50 text-slate-800" : "border-slate-600 bg-slate-950/50 text-emerald-200"
          }`}
        >
          <span className="flex-1 break-all">{farmerWallet || "Unavailable"}</span>
          <button
            type="button"
            onClick={copyFarmer}
            disabled={!farmerWallet}
            className="rounded-lg border border-emerald-400/30 p-1.5 text-emerald-300 hover:bg-emerald-400/10 disabled:opacity-40"
            aria-label="Copy farmer wallet address"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        {farmerWallet ? (
          <a
            href={explorerAddressUrl(farmerWallet)}
            target="_blank"
            rel="noreferrer"
            className={`mt-1 inline-block text-[11px] ${isLight ? "text-emerald-700" : "text-emerald-400"}`}
          >
            View on Solana Explorer
          </a>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Amount due</p>
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

      <div
        className={`rounded-xl border px-3 py-2 text-xs ${
          isLight ? "border-slate-200 bg-slate-50" : "border-slate-600 bg-slate-950/40"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`font-medium uppercase tracking-wide ${muted}`}>Your wallet</p>
          <span className={`inline-flex items-center gap-1 ${walletConnected ? "text-emerald-400" : "text-amber-300"}`}>
            <Wallet className="h-3.5 w-3.5" />
            {walletConnected ? shorten(buyerWallet) : "Not connected"}
          </span>
        </div>
        <p className={`mt-1 ${label}`}>
          Available:{" "}
          {balanceLoading ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </span>
          ) : balanceSol != null ? (
            <span className="font-mono text-emerald-300">{balanceSol.toFixed(4)} SOL</span>
          ) : (
            "—"
          )}
        </p>
        {lowBalance ? (
          <p className="mt-1 text-[11px] font-medium text-amber-400">
            Insufficient balance for this payment plus fees. Fund your wallet or request devnet SOL below.
          </p>
        ) : null}
        {faucetVisible ? (
          <button
            type="button"
            disabled={airdropBusy || disabled}
            onClick={handleAirdrop}
            className={`mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${
              isLight
                ? "border-cyan-300 bg-cyan-50 text-cyan-900 hover:bg-cyan-100"
                : "border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15"
            }`}
          >
            {airdropBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Droplets className="h-3.5 w-3.5" />}
            Request Devnet SOL (1)
          </button>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        {phase === "simulating" && (
          <motion.div
            key="pulse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${isLight ? "bg-emerald-50 text-emerald-900" : "bg-emerald-500/15 text-emerald-200"}`}
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />
            Simulating transaction on Solana RPC…
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={disabled || phase === "simulating"}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
            walletConnected
              ? "border-emerald-500 bg-emerald-500/15 text-emerald-200"
              : isLight
                ? "border-slate-300 bg-white hover:border-emerald-400"
                : "border-slate-500 bg-slate-800 hover:border-emerald-400"
          }`}
        >
          <Wallet className="h-4 w-4" />
          {walletConnected ? "Wallet Connected" : "Connect on landing first"}
        </button>
        <button
          type="button"
          disabled={!walletConnected || !farmerWallet || disabled || phase === "simulating" || lowBalance}
          onClick={handleConfirm}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 transition disabled:opacity-50 ${
            phase === "simulating" ? "animate-pulse bg-emerald-400" : "bg-emerald-500 hover:bg-emerald-400"
          }`}
        >
          {phase === "simulating" ? "Validating…" : "Confirm Payment"}
        </button>
      </div>

      <p className={`text-[11px] ${label}`}>
        Phantom will sign the real SOL transfer after this step. RPC runs{" "}
        <span className="font-semibold">simulateTransaction</span> before submission; settlement uses{" "}
        <span className="font-semibold">sendRawTransaction</span> + confirmation polling.
      </p>
    </div>
  );
}
