import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { validateCardForm, simulateCardPayment } from "../../services/mockPaymentApi";

/** Bank card checkout with client-side demo validation + mock processor delay. */
export default function CheckoutCard({ amountSol, scenario, isLight, disabled, onSuccess, onError, onBusy }) {
  const [form, setForm] = useState({ name: "", number: "", expiry: "", cvv: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onBusy?.(loading);
    return () => onBusy?.(false);
  }, [loading, onBusy]);

  const muted = isLight ? "text-slate-500" : "text-slate-400";
  const input = isLight
    ? "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
    : "border-slate-600 bg-slate-950/50 text-white placeholder:text-slate-500";

  const setField = (k, v) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = validateCardForm(form);
    setErrors(v);
    if (Object.keys(v).length) return;

    const last4 = String(form.number).replace(/\s/g, "").slice(-4);
    setLoading(true);
    try {
      const receipt = await simulateCardPayment({
        amountSol,
        scenario,
        cardLast4: last4,
      });
      await onSuccess?.(receipt);
    } catch (err) {
      onError?.(err.message || "Card payment failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form layout onSubmit={submit} className="space-y-3">
      <div>
        <label className={`mb-1 block text-xs ${muted}`}>Cardholder Name</label>
        <input
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-400 ${input}`}
          placeholder="Ada Lovelace"
          disabled={disabled || loading}
        />
        {errors.name ? <p className="mt-1 text-xs text-rose-400">{errors.name}</p> : null}
      </div>
      <div>
        <label className={`mb-1 block text-xs ${muted}`}>Card Number</label>
        <input
          value={form.number}
          onChange={(e) => setField("number", e.target.value.replace(/[^\d\s]/g, ""))}
          className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-400 ${input}`}
          placeholder="4532 0151 1283 0366"
          disabled={disabled || loading}
        />
        <p className={`mt-0.5 text-[10px] ${muted}`}>Use test number 4532015112830366 (passes Luhn)</p>
        {errors.number ? <p className="mt-1 text-xs text-rose-400">{errors.number}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`mb-1 block text-xs ${muted}`}>Expiry MM/YY</label>
          <input
            value={form.expiry}
            onChange={(e) => setField("expiry", e.target.value)}
            className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-400 ${input}`}
            placeholder="12/28"
            disabled={disabled || loading}
          />
          {errors.expiry ? <p className="mt-1 text-xs text-rose-400">{errors.expiry}</p> : null}
        </div>
        <div>
          <label className={`mb-1 block text-xs ${muted}`}>CVV</label>
          <input
            value={form.cvv}
            onChange={(e) => setField("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
            className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-400 ${input}`}
            placeholder="123"
            disabled={disabled || loading}
          />
          {errors.cvv ? <p className="mt-1 text-xs text-rose-400">{errors.cvv}</p> : null}
        </div>
      </div>
      <p className={`text-sm ${isLight ? "text-slate-700" : "text-slate-200"}`}>
        Total due:{" "}
        <span className="font-semibold text-emerald-400">{Number(amountSol).toFixed(4)} SOL</span>{" "}
        <span className={`text-xs ${muted}`}>(sandbox)</span>
      </p>
      <button
        type="submit"
        disabled={disabled || loading}
        className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-50"
      >
        {loading ? "Processing…" : "Pay Now"}
      </button>
    </motion.form>
  );
}
