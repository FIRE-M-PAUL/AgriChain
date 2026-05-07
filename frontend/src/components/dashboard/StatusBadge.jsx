const badgeStyles = {
  verified: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
  pending: "bg-amber-500/20 text-amber-300 border-amber-400/30",
  failed: "bg-rose-500/20 text-rose-300 border-rose-400/30",
  delivered: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30",
  transit: "bg-indigo-500/20 text-indigo-300 border-indigo-400/30",
  active: "bg-lime-500/20 text-lime-300 border-lime-400/30",
  default: "bg-slate-600/40 text-slate-200 border-slate-500/40",
};

function normalizeStatus(value = "") {
  const raw = String(value).toLowerCase();
  if (raw.includes("deliver")) return "delivered";
  if (raw.includes("transit")) return "transit";
  if (raw.includes("verify") || raw === "success") return "verified";
  if (raw.includes("pending") || raw.includes("progress")) return "pending";
  if (raw.includes("fail") || raw.includes("reject") || raw.includes("error")) return "failed";
  if (raw.includes("active") || raw.includes("connected")) return "active";
  return "default";
}

export default function StatusBadge({ label, className = "" }) {
  const key = normalizeStatus(label);
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${badgeStyles[key]} ${className}`}>
      {label}
    </span>
  );
}
