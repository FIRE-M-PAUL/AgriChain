import { motion } from "framer-motion";
import StatusBadge from "./StatusBadge";

export default function ProductTimeline({ steps }) {
  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <motion.li key={step.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`h-3 w-3 rounded-full ${step.done ? "bg-emerald-400" : "bg-slate-600"}`} />
              {index < steps.length - 1 ? <span className="mt-1 h-8 w-px bg-slate-700" /> : null}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{step.title}</p>
              <p className="text-xs text-slate-400">{step.description}</p>
              <div className="mt-1">
                <StatusBadge label={step.done ? "verified" : "pending"} />
              </div>
            </div>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
