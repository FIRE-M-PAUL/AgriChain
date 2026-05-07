import { motion } from "framer-motion";
import MainLayout from "../layouts/MainLayout";
import Card from "./Card";
import BuyerSidebar from "./BuyerSidebar";

export default function BuyerPageScaffold({ title, subtitle, children, rightSlot = null }) {
  return (
    <MainLayout>
      <div className="grid gap-6 lg:grid-cols-[240px,1fr]">
        <BuyerSidebar />
        <div className="space-y-5">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border border-cyan-300/20 bg-gradient-to-br from-cyan-500/15 to-slate-950/80">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white md:text-3xl">{title}</h1>
                  <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
                </div>
                {rightSlot}
              </div>
            </Card>
          </motion.div>
          {children}
        </div>
      </div>
    </MainLayout>
  );
}
