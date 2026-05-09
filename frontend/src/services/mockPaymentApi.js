import { MOCK_ERROR_SCENARIOS } from "../components/payment-simulation/paymentConstants";

/**
 * Artificial delays (ms) — keeps UX feeling like real network / chain confirmation.
 */
const timings = {
  fast: 600,
  medium: 1400,
  confirm: 2200,
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maybeReject(scenario, messageMap) {
  switch (scenario) {
    case MOCK_ERROR_SCENARIOS.INSUFFICIENT_FUNDS:
      return Promise.reject(new Error(messageMap.insufficientFunds));
    case MOCK_ERROR_SCENARIOS.INVALID_NUMBER:
      return Promise.reject(new Error(messageMap.invalidNumber));
    case MOCK_ERROR_SCENARIOS.NETWORK_TIMEOUT:
      return Promise.reject(new Error(messageMap.timeout));
    case MOCK_ERROR_SCENARIOS.CANCELLED:
      return Promise.reject(new Error(messageMap.cancelled));
    default:
      return Promise.resolve();
  }
}

/** Simple Luhn check for card demo validation. */
export function luhnCheck(num) {
  const s = String(num).replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(s)) return false;
  let sum = 0;
  let alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let n = parseInt(s.charAt(i), 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function validateCardForm({ name, number, expiry, cvv }) {
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = "Enter cardholder name";
  const digits = String(number || "").replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(digits)) errors.number = "Invalid card number";
  else if (!luhnCheck(digits)) errors.number = "Card number failed validation";
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(String(expiry || "").trim())) {
    errors.expiry = "Use MM/YY";
  } else {
    const [mm, yy] = expiry.split("/");
    const exp = new Date(2000 + parseInt(yy, 10), parseInt(mm, 10) - 1);
    if (exp < new Date()) errors.expiry = "Card expired";
  }
  if (!/^\d{3,4}$/.test(String(cvv || ""))) errors.cvv = "Invalid CVV";
  return errors;
}

export function validateZambiaMobile(phone) {
  const p = String(phone || "").replace(/\s/g, "");
  // Zambia local 0XXXXXXXXX (10 digits) or +260XXXXXXXXX
  return /^0[0-9]{9}$/.test(p) || /^\+260[0-9]{9}$/.test(p);
}

/**
 * Simulates Solana payment flow: connect → confirm → chain wait.
 * @param {{ amountSol: number, scenario: string }} params
 */
export async function simulateSolanaPayment({ amountSol, scenario }) {
  await delay(timings.fast);
  await maybeReject(scenario, {
    insufficientFunds: "Insufficient SOL in simulated wallet.",
    invalidNumber: "Invalid transaction parameters.",
    timeout: "Network timeout — Solana RPC unavailable (simulated).",
    cancelled: "Transaction cancelled by user (simulated).",
  });
  await delay(timings.medium);
  return {
    id: `sol_${Date.now()}`,
    method: "Solana",
    amountSol,
    signature: `sim_${Math.random().toString(36).slice(2, 14)}`,
    confirmedAt: new Date().toISOString(),
  };
}

/**
 * Simulates card processor.
 */
export async function simulateCardPayment({ amountSol, scenario, cardLast4 }) {
  await delay(timings.medium);
  await maybeReject(scenario, {
    insufficientFunds: "Card declined — insufficient funds (simulated).",
    invalidNumber: "Invalid card details (simulated).",
    timeout: "Payment gateway timeout (simulated).",
    cancelled: "Payment cancelled (simulated).",
  });
  await delay(timings.fast);
  return {
    id: `card_${Date.now()}`,
    method: "Bank Card",
    amountSol,
    cardLast4,
    confirmedAt: new Date().toISOString(),
  };
}

/**
 * Simulates mobile money steps: request sent → waiting → success.
 * @param {{ operator: string, phone: string, amountDisplay: string, scenario: string, onStatus?: (s: string) => void }} params
 */
export async function simulateMobileMoneyPayment({
  operator,
  phone,
  amountDisplay,
  scenario,
  onStatus,
}) {
  const status = (s) => onStatus?.(s);

  status("Payment request sent");
  await delay(timings.fast);

  await maybeReject(scenario, {
    insufficientFunds: "Mobile money wallet has insufficient balance (simulated).",
    invalidNumber: "Invalid mobile number for this network (simulated).",
    timeout: "USSD gateway timeout (simulated).",
    cancelled: "Payment request cancelled (simulated).",
  });

  status("Waiting for confirmation");
  await delay(timings.confirm);

  status("Payment successful");
  await delay(timings.fast);

  return {
    id: `mm_${Date.now()}`,
    method: `${operator} Mobile Money`,
    phone,
    amountDisplay,
    confirmedAt: new Date().toISOString(),
  };
}
