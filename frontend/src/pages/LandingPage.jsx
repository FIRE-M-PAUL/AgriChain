import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { QrCode, Leaf, ShieldCheck } from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import BrandLogo from "../components/BrandLogo";
import Card from "../components/Card";

export default function LandingPage() {
  const features = [
    { icon: Leaf, title: "Record Crops", text: "Farmers save crops and quantities in seconds." },
    { icon: QrCode, title: "Instant QR", text: "Every entry gets a unique QR code for traceability." },
    { icon: ShieldCheck, title: "Buyer Trust", text: "Buyers scan and verify product details instantly." },
  ];
  return (
    <MainLayout>
      <section className="space-y-10 py-10 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="mx-auto flex justify-center">
          <div className="rounded-3xl bg-slate-900/40 p-3 shadow-[0_0_40px_rgba(34,197,94,0.35)]">
            <BrandLogo size="xl" showTagline animated compact />
          </div>
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold md:text-6xl">
          Smart Crop Traceability with <span className="text-primary">AGRICHAIN</span>
        </motion.h1>
        <p className="text-sm text-emerald-200/80">Blockchain • Farming • Trust</p>
        <p className="mx-auto max-w-2xl text-slate-300">
          AGRICHAIN helps farmers register products and generate QR codes so buyers can instantly verify crop origin, quantity, and product details.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/scanner" className="rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-medium">
            Scan QR
          </Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <Card key={title} className="space-y-3">
            <Icon className="text-primary" />
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-slate-300">{text}</p>
          </Card>
        ))}
      </section>
    </MainLayout>
  );
}
