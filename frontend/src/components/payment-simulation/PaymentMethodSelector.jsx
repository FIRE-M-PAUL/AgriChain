import { Check } from "lucide-react";
import { PAYMENT_METHOD_IDS } from "./paymentConstants";

const methods = [
  {
    id: PAYMENT_METHOD_IDS.SOLANA,
    title: "Solana",
    subtitle: "Crypto",
    description: "Pay with SOL from your wallet.",
    icon: "◎",
  },
  {
    id: PAYMENT_METHOD_IDS.CARD,
    title: "Bank Card",
    subtitle: "Visa / Mastercard",
    description: "Secure card checkout (simulated).",
    icon: "💳",
  },
  {
    id: PAYMENT_METHOD_IDS.MTN,
    title: "MTN Mobile Money",
    subtitle: "Mobile Money",
    description: "Pay with your MTN wallet.",
    icon: "📱",
  },
  {
    id: PAYMENT_METHOD_IDS.AIRTEL,
    title: "Airtel Money",
    subtitle: "Mobile Money",
    description: "Pay with Airtel Money.",
    icon: "📶",
  },
  {
    id: PAYMENT_METHOD_IDS.ZAMTEL,
    title: "Zamtel Kwacha",
    subtitle: "Mobile Money",
    description: "Pay with Zamtel.",
    icon: "📲",
  },
];

export default function PaymentMethodSelector({ selectedId, onSelect, isLight }) {
  const cardBase = isLight
    ? "border-slate-200 bg-white hover:border-emerald-400/50"
    : "border-slate-600 bg-slate-800/40 hover:border-emerald-400/40";
  const cardActive = isLight
    ? "border-emerald-500 ring-2 ring-emerald-500/20"
    : "border-emerald-400 ring-2 ring-emerald-400/25";

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {methods.map((m) => {
        const active = selectedId === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${cardBase} ${
              active ? cardActive : ""
            }`}
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg ${
                isLight ? "bg-slate-100" : "bg-white/10"
              }`}
            >
              {m.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`flex items-center justify-between gap-2 font-semibold ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                {m.title}
                {active ? <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden /> : null}
              </span>
              <span className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>{m.subtitle}</span>
              <p className={`mt-0.5 text-xs ${isLight ? "text-slate-600" : "text-slate-300"}`}>{m.description}</p>
            </span>
          </button>
        );
      })}
    </div>
  );
}
