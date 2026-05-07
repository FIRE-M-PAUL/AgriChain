import { motion } from "framer-motion";
import Card from "../Card";

export default function AnalyticsCard({ title, value, subtitle, icon: Icon, trend }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="h-full border border-white/10 bg-gradient-to-br from-white/10 to-white/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
            <p className="mt-2 text-3xl font-bold text-white">{value}</p>
            <p className="mt-1 text-xs text-slate-300">{subtitle}</p>
          </div>
          {Icon ? (
            <div className="rounded-xl bg-emerald-500/20 p-2 text-emerald-300">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
        </div>
        {trend ? <p className="mt-4 text-xs text-emerald-300">{trend}</p> : null}
      </Card>
    </motion.div>
  );
}
