import { motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { useIsLightTheme } from "./useIsLightTheme";

/** Receipt view after mock payment — optional follow-up blockchain step happens outside. */
export default function PaymentReceiptModal({ receipt, onClose }) {
  const isLight = useIsLightTheme();
  const shell = isLight ? "border-slate-200 bg-white text-slate-900 shadow-xl" : "border-emerald-500/20 bg-slate-900 text-white shadow-emerald-500/10";
  const muted = isLight ? "text-slate-500" : "text-slate-400";

  if (!receipt) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        aria-label="Close receipt"
        onClick={onClose}
      />
      <motion.article
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className={`relative z-10 w-full max-w-md rounded-2xl border p-5 ${shell}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.08 }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400"
            >
              <CheckCircle2 className="h-6 w-6" />
            </motion.span>
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-500">Payment successful</p>
              <h2 className="text-lg font-bold">Receipt</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full p-1.5 ${isLight ? "hover:bg-slate-100" : "hover:bg-slate-800"}`}
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <dl className="mt-5 space-y-2 text-sm">
          <Row isLight={isLight} label="Reference" value={receipt.id} muted={muted} />
          <Row isLight={isLight} label="Method" value={receipt.method} muted={muted} />
          {(receipt.amountSol != null && Number.isFinite(Number(receipt.amountSol))) ||
          receipt.amountDisplay ? (
            <Row
              isLight={isLight}
              label="Amount"
              value={
                receipt.amountDisplay ??
                `${Number(receipt.amountSol).toFixed(4)} SOL`
              }
              muted={muted}
            />
          ) : null}
          {receipt.signature ? (
            <Row
              isLight={isLight}
              label="Solana sig (sim)"
              value={String(receipt.signature).slice(0, 28) + "…"}
              muted={muted}
            />
          ) : null}
          {receipt.cardLast4 ? (
            <Row isLight={isLight} label="Card" value={`•••• ${receipt.cardLast4}`} muted={muted} />
          ) : null}
          {receipt.phone ? <Row isLight={isLight} label="Phone" value={receipt.phone} muted={muted} /> : null}
          {receipt.cropName ? (
            <Row isLight={isLight} label="Product" value={receipt.cropName} muted={muted} />
          ) : null}
          {receipt.quantity != null ? (
            <Row isLight={isLight} label="Quantity" value={String(receipt.quantity)} muted={muted} />
          ) : null}
          <Row
            isLight={isLight}
            label="Confirmed"
            value={new Date(receipt.confirmedAt || Date.now()).toLocaleString()}
            muted={muted}
          />
        </dl>

        <p className={`mt-4 text-[11px] ${muted}`}>
          Simulation only — totals shown are illustrative. Blockchain settlement may still run afterward.
        </p>
      </motion.article>
    </div>
  );
}

function Row({ label, value, muted, isLight }) {
  const border = isLight ? "border-slate-200" : "border-slate-600/80";
  return (
    <div className={`flex justify-between gap-3 rounded-xl border px-3 py-2 ${border}`}>
      <dt className={muted}>{label}</dt>
      <dd className="max-w-[60%] break-words text-right font-medium">{value}</dd>
    </div>
  );
}
