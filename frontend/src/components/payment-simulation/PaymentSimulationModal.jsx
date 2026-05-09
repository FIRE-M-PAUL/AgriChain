import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import { usePaymentSimulation } from "../../context/PaymentSimulationContext";
import { MOCK_ERROR_SCENARIOS, PAYMENT_METHOD_IDS } from "./paymentConstants";
import PaymentMethodSelector from "./PaymentMethodSelector";
import CheckoutSolana from "./CheckoutSolana";
import CheckoutCard from "./CheckoutCard";
import CheckoutMobileMoney from "./CheckoutMobileMoney";
import { useIsLightTheme } from "./useIsLightTheme";

const scenarioOptions = [
  { value: MOCK_ERROR_SCENARIOS.NONE, label: "Success (no error)" },
  { value: MOCK_ERROR_SCENARIOS.INSUFFICIENT_FUNDS, label: "Simulate: insufficient funds" },
  { value: MOCK_ERROR_SCENARIOS.INVALID_NUMBER, label: "Simulate: invalid number / details" },
  { value: MOCK_ERROR_SCENARIOS.NETWORK_TIMEOUT, label: "Simulate: network timeout" },
  { value: MOCK_ERROR_SCENARIOS.CANCELLED, label: "Simulate: transaction cancelled" },
];

/**
 * Full-screen checkout: method selection → channel-specific form → mock API (setTimeout).
 * Busy state blocks dismiss to avoid losing in-flight simulation.
 */
export default function PaymentSimulationModal() {
  const isLight = useIsLightTheme();
  const {
    isOpen,
    checkoutSession,
    closeCheckout,
    mockScenario,
    setMockScenario,
    pushHistory,
    showReceipt,
    history,
  } = usePaymentSimulation();

  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHOD_IDS.SOLANA);
  /** Lifted busy from active checkout panel — disables backdrop close. */
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const amountSol = checkoutSession?.amountSol ?? 0;

  const handleError = useCallback((msg) => {
    toast.error(msg || "Something went wrong.");
  }, []);

  /** Merge session metadata into receipt, persist, dismiss shell, surface receipt drawer. */
  const handleSuccess = useCallback(
    async (receiptBase) => {
      const session = checkoutSession;
      const enriched = {
        ...receiptBase,
        productId: session?.product?.id,
        cropName: session?.product?.cropName,
        quantity: session?.quantity,
      };
      pushHistory(enriched);
      toast.success("Payment confirmed (simulated).");
      closeCheckout();
      showReceipt(enriched);
      try {
        await session?.onAfterSuccess?.();
      } catch {
        toast.error("Could not complete purchase after simulated payment.");
      }
    },
    [checkoutSession, pushHistory, closeCheckout, showReceipt]
  );

  const shell = useMemo(
    () =>
      isLight
        ? "border-slate-200 bg-white/95 text-slate-900"
        : "border-slate-600 bg-slate-900/95 text-slate-100",
    [isLight]
  );

  const muted = isLight ? "text-slate-500" : "text-slate-400";

  if (!isOpen || !checkoutSession) return null;

  const productLabel =
    checkoutSession.product?.cropName || checkoutSession.label || "Your order";

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center p-3 sm:p-6 sm:items-center">
      <motion.button
        type="button"
        aria-label="Close checkout"
        disabled={busy}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] disabled:cursor-not-allowed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !busy && closeCheckout()}
      />

      <motion.div
        layout
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className={`relative z-10 flex max-h-[min(92vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl ${shell}`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-inherit px-4 py-3 sm:px-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-500">Secure checkout</p>
            <h2 className="text-lg font-bold">Payment simulation</h2>
            <p className={`text-sm ${muted}`}>{productLabel}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => !busy && closeCheckout()}
            className="rounded-full p-2 hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
            aria-label="Close"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin text-emerald-400" /> : <X className="h-5 w-5" />}
          </button>
        </header>

        <div className={`border-b px-4 py-2 sm:px-5 ${isLight ? "bg-emerald-50/80 border-emerald-100" : "border-slate-700 bg-emerald-500/10"}`}>
          <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
            Amount due (reference)
          </p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-300">
            {Number(amountSol).toFixed(4)}{" "}
            <span className="text-sm font-semibold opacity-90">SOL</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <label className={`mb-1 block text-[11px] font-medium uppercase tracking-wide ${muted}`}>
            Demo error scenario (mock API)
          </label>
          <select
            value={mockScenario}
            onChange={(e) => setMockScenario(e.target.value)}
            disabled={busy}
            className={`mb-4 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-400 disabled:opacity-50 ${
              isLight ? "border-slate-200 bg-white" : "border-slate-600 bg-slate-950/50 text-white"
            }`}
          >
            {scenarioOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${muted}`}>Choose payment method</p>
          <PaymentMethodSelector
            selectedId={selectedMethod}
            onSelect={(id) => !busy && setSelectedMethod(id)}
            isLight={isLight}
          />

          <div className={`mt-5 rounded-xl border p-4 ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-600 bg-slate-950/40"}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedMethod}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                {selectedMethod === PAYMENT_METHOD_IDS.SOLANA ? (
                  <CheckoutSolana
                    amountSol={amountSol}
                    scenario={mockScenario}
                    isLight={isLight}
                    disabled={busy}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    onBusy={setBusy}
                  />
                ) : selectedMethod === PAYMENT_METHOD_IDS.CARD ? (
                  <CheckoutCard
                    amountSol={amountSol}
                    scenario={mockScenario}
                    isLight={isLight}
                    disabled={busy}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    onBusy={setBusy}
                  />
                ) : (
                  <CheckoutMobileMoney
                    operatorId={selectedMethod}
                    amountSol={amountSol}
                    scenario={mockScenario}
                    isLight={isLight}
                    disabled={busy}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    onBusy={setBusy}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Local payment simulation history — separate from blockchain purchase history on marketplace */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                isLight ? "border-slate-200 bg-white hover:border-emerald-300" : "border-slate-600 hover:border-emerald-500/40"
              }`}
            >
              <span>Simulated payment history ({history.length})</span>
              {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <AnimatePresence>
              {historyOpen ? (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`mt-2 space-y-2 overflow-hidden ${muted}`}
                >
                  {!history.length ? (
                    <li className="text-xs italic">No simulated payments yet.</li>
                  ) : (
                    history.slice(0, 8).map((h) => (
                      <li
                        key={h.id}
                        className={`rounded-lg border px-3 py-2 text-xs ${
                          isLight ? "border-slate-100 bg-white" : "border-slate-700 bg-slate-800/50"
                        }`}
                      >
                        <span className="font-semibold text-emerald-500">{h.method}</span>
                        {" · "}
                        {h.amountDisplay ?? `${Number(h.amountSol || 0).toFixed(4)} SOL`}
                        {h.cropName ? ` · ${h.cropName}` : ""}
                        <br />
                        <span className={muted}>{new Date(h.confirmedAt || Date.now()).toLocaleString()}</span>
                      </li>
                    ))
                  )}
                </motion.ul>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
