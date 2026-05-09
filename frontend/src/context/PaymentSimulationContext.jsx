import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { MOCK_ERROR_SCENARIOS } from "../components/payment-simulation/paymentConstants";

const PaymentSimulationContext = createContext(null);

const HISTORY_KEY = "agrichain_payment_history_v1";

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch {
    /* quota / private mode */
  }
}

/**
 * Checkout session shape (typical caller: marketplace): product, quantity, amountSol, onAfterSuccess().
 * mockScenario drives deterministic failures in mockPaymentApi.maybeReject().
 */
export function PaymentSimulationProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [mockScenario, setMockScenario] = useState(MOCK_ERROR_SCENARIOS.NONE);

  const openCheckout = useCallback((session) => {
    setCheckoutSession(session);
    setIsOpen(true);
  }, []);

  const closeCheckout = useCallback(() => {
    setIsOpen(false);
    setCheckoutSession(null);
  }, []);

  const pushHistory = useCallback((entry) => {
    setHistory((prev) => {
      const next = [entry, ...prev];
      saveHistory(next);
      return next;
    });
  }, []);

  const showReceipt = useCallback((receipt) => setLastReceipt(receipt), []);

  const dismissReceipt = useCallback(() => setLastReceipt(null), []);

  const value = useMemo(
    () => ({
      isOpen,
      checkoutSession,
      mockScenario,
      setMockScenario,
      openCheckout,
      closeCheckout,
      lastReceipt,
      showReceipt,
      dismissReceipt,
      history,
      pushHistory,
    }),
    [
      isOpen,
      checkoutSession,
      mockScenario,
      openCheckout,
      closeCheckout,
      lastReceipt,
      showReceipt,
      dismissReceipt,
      history,
      pushHistory,
    ]
  );

  return (
    <PaymentSimulationContext.Provider value={value}>{children}</PaymentSimulationContext.Provider>
  );
}

export function usePaymentSimulation() {
  const ctx = useContext(PaymentSimulationContext);
  if (!ctx) {
    throw new Error("usePaymentSimulation must be used within PaymentSimulationProvider");
  }
  return ctx;
}
