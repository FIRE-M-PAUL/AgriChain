import { AnimatePresence } from "framer-motion";
import { usePaymentSimulation } from "../../context/PaymentSimulationContext";
import PaymentSimulationModal from "./PaymentSimulationModal";
import PaymentReceiptModal from "./PaymentReceiptModal";

/** Mounts checkout + receipt layers; keep near app root for correct z-index stacking. */
export default function PaymentSimulationHost() {
  const { isOpen, lastReceipt, dismissReceipt } = usePaymentSimulation();

  return (
    <>
      <AnimatePresence>{isOpen ? <PaymentSimulationModal key="checkout" /> : null}</AnimatePresence>
      <AnimatePresence>
        {lastReceipt ? (
          <PaymentReceiptModal key={lastReceipt.id} receipt={lastReceipt} onClose={dismissReceipt} />
        ) : null}
      </AnimatePresence>
    </>
  );
}
