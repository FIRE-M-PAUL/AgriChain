import { Bell } from "lucide-react";
import { motion } from "framer-motion";
import Card from "../Card";
import StatusBadge from "./StatusBadge";

export default function NotificationCard({ item }) {
  return (
    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
      <Card className="border border-white/10">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/20 p-2 text-primary">
            <Bell className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <StatusBadge label={item.status} />
            </div>
            <p className="mt-1 text-xs text-slate-300">{item.message}</p>
            <p className="mt-2 text-[11px] text-slate-400">{item.time}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
