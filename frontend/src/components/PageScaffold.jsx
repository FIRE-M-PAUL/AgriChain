import { motion } from "framer-motion";
import MainLayout from "../layouts/MainLayout";
import Sidebar from "./Sidebar";
import Card from "./Card";

export default function PageScaffold({ title, subtitle, children }) {
  return (
    <MainLayout>
      <div className="grid gap-6 lg:grid-cols-[240px,1fr]">
        <Sidebar />
        <div className="space-y-5">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border border-emerald-300/20 bg-gradient-to-br from-emerald-500/15 to-slate-950/80">
              <h1 className="text-2xl font-bold text-white md:text-3xl">{title}</h1>
              <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
            </Card>
          </motion.div>
          {children}
        </div>
      </div>
    </MainLayout>
  );
}
