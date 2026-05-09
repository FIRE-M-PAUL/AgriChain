/** Payment method identifiers — only one active at a time in checkout UI. */

export const PAYMENT_METHOD_IDS = {
  SOLANA: "solana",
  CARD: "card",
  MTN: "mtn",
  AIRTEL: "airtel",
  ZAMTEL: "zamtel",
};

/** Simulated failure modes for demo / QA (drives mock API rejections). */
export const MOCK_ERROR_SCENARIOS = {
  NONE: "none",
  INSUFFICIENT_FUNDS: "insufficient_funds",
  INVALID_NUMBER: "invalid_number",
  NETWORK_TIMEOUT: "network_timeout",
  CANCELLED: "cancelled",
};

export const MOCK_SOLANA_WALLET =
  "AGR8CHnSimDemo111111111111111111111111111111111111112";
