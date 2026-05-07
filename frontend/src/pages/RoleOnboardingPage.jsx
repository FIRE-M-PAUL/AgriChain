import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import Card from "../components/Card";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../context/AuthContext";

export default function RoleOnboardingPage() {
  const navigate = useNavigate();
  const { selectRole, isSettingRole } = useAuth();

  const chooseRole = async (role) => {
    try {
      await selectRole(role);
      toast.success(`Role selected: ${role}`);
      navigate(role === "farmer" ? "/dashboard" : "/buyer/dashboard", { replace: true });
    } catch (error) {
      toast.error(error.message || "Could not save role");
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl">
        <Card className="border border-emerald-300/20 bg-gradient-to-br from-slate-900/80 to-slate-950/90">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4 flex justify-center md:justify-start">
              <BrandLogo size="lg" showTagline animated />
            </div>
            <p className="text-sm text-emerald-300">Welcome to AGRICHAIN</p>
            <h1 className="mt-2 text-3xl font-bold text-white">How would you like to use the platform?</h1>
            <p className="mt-2 text-sm text-slate-300">Your wallet stays your identity. Choose a role once, and AGRICHAIN will remember it on future logins.</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <button
                disabled={isSettingRole}
                onClick={() => chooseRole("farmer")}
                className="rounded-2xl border border-emerald-300/40 bg-emerald-500/10 p-5 text-left transition hover:bg-emerald-500/20 disabled:opacity-70"
              >
                <p className="text-lg font-semibold text-emerald-200">👨‍🌾 I am a Farmer</p>
                <p className="mt-1 text-xs text-slate-300">Register crops, generate QR, submit AI verification, and build trust score.</p>
              </button>
              <button
                disabled={isSettingRole}
                onClick={() => chooseRole("buyer")}
                className="rounded-2xl border border-cyan-300/40 bg-cyan-500/10 p-5 text-left transition hover:bg-cyan-500/20 disabled:opacity-70"
              >
                <p className="text-lg font-semibold text-cyan-200">🛒 I am a Buyer</p>
                <p className="mt-1 text-xs text-slate-300">Scan QR codes, verify product authenticity, and review blockchain proof.</p>
              </button>
            </div>
          </motion.div>
        </Card>
      </div>
    </MainLayout>
  );
}
