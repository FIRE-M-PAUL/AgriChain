import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  simulateMobileMoneyPayment,
  validateZambiaMobile,
} from "../../services/mockPaymentApi";

function operatorTitle(id) {
  if (id === "mtn") return "MTN";
  if (id === "airtel") return "Airtel";
  if (id === "zamtel") return "Zamtel";
  return "Mobile Money";
}

/** Mobile Money: USSD-style status messages + mocked confirmation pipeline. */
export default function CheckoutMobileMoney({
  operatorId,
  amountSol,
  scenario,
  isLight,
  disabled,
  onSuccess,
  onError,
  onBusy,
}) {
  /** Display local currency equivalent — purely illustrative. */
  const zmw = (Number(amountSol) * 820).toFixed(2);

  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onBusy?.(loading);
    return () => onBusy?.(false);
  }, [loading, onBusy]);

  const muted = isLight ? "text-slate-500" : "text-slate-400";
  const input = isLight
    ? "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
    : "border-slate-600 bg-slate-950/50 text-white placeholder:text-slate-500";

  const send = async () => {
    if (!validateZambiaMobile(phone)) {
      onError?.("Enter a valid Zambian mobile number e.g. 0977123456");
      return;
    }
    const operator = `${operatorTitle(operatorId)}`;

    setLoading(true);
    setStatus("");
    try {
      const receipt = await simulateMobileMoneyPayment({
        operator,
        phone,
        amountDisplay: `ZMW ${zmw}`,
        scenario,
        onStatus: setStatus,
      });
      await onSuccess?.(receipt);
    } catch (e) {
      onError?.(e.message || "Mobile money payment failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={`mb-1 block text-xs ${muted}`}>Phone number ({operatorTitle(operatorId)})</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0977123456"
          disabled={disabled || loading}
          className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-400 ${input}`}
        />
      </div>
      <div
        className={`rounded-xl border px-4 py-3 text-sm ${isLight ? "border-emerald-200 bg-emerald-50/80" : "border-emerald-500/25 bg-emerald-500/10"}`}
      >
        <p className={`text-xs uppercase tracking-wide ${muted}`}>Amount to pay</p>
        <p className={`text-lg font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
          ZMW {zmw}
        </p>
        <p className={`text-xs ${muted}`}>≈ {Number(amountSol).toFixed(4)} SOL reference</p>
      </div>

      <AnimatePresence>
        {status ? (
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-xl px-3 py-2 text-sm ${isLight ? "bg-blue-50 text-blue-900" : "bg-cyan-500/15 text-cyan-100"}`}
          >
            {status}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        disabled={disabled || loading}
        onClick={send}
        className="w-full rounded-xl border border-emerald-400/50 bg-emerald-500 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
      >
        {loading ? "Please wait…" : "Send Payment Request"}
      </button>
      <p className={`text-[11px] ${muted}`}>
        USSD prompts are simulated — no SMS is sent from this demo.
      </p>
    </div>
  );
}
