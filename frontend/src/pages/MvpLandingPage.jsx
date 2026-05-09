import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Menu, Mic, QrCode, Sprout, Store, Wallet, X } from "lucide-react";
import PhantomConnectButton from "../components/PhantomConnectButton";
import { setStoredWalletAddress } from "../services/walletSession";

const HERO_IMAGE = "/hero-agrichain.png";

const features = [
  { icon: Wallet, title: "Phantom Identity", text: "Farmer identity is anchored by wallet connection." },
  { icon: Mic, title: "Voice Input", text: "Farmers can speak crop details for faster recording." },
  { icon: QrCode, title: "QR Traceability", text: "Instant QR generation for buyer verification scans." },
  { icon: Sprout, title: "Supabase + Solana", text: "PostgreSQL + Storage with minimal proof on Solana." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function MvpLandingPage() {
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState("");
  /** Shown only after the user taps Connect and Phantom is not available (not on first paint). */
  const [showPhantomInstallPrompt, setShowPhantomInstallPrompt] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const connectPhantom = async () => {
    setMobileMenuOpen(false);
    if (typeof window === "undefined" || !window.solana?.isPhantom) {
      setShowPhantomInstallPrompt(true);
      toast.error("Phantom wallet not found. Install Phantom to continue.");
      return;
    }
    try {
      const response = await window.solana.connect();
      const address = response?.publicKey?.toString?.() || window.solana.publicKey?.toString?.() || "";
      if (!address) throw new Error("Unable to read wallet address");
      setWalletAddress(address);
      setStoredWalletAddress(address);
      toast.success("Phantom wallet connected.");
      navigate("/role");
    } catch {
      toast.error("Could not connect to Phantom wallet.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mvp-hero relative isolate flex min-h-[115vh] flex-col overflow-hidden">
        <div
          className="mvp-hero-photo pointer-events-none absolute inset-0 will-change-transform"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          aria-hidden
        />
        {/* Light film only — keeps maize + sunrise as the hero */}
        <div className="pointer-events-none absolute inset-0 bg-[rgba(15,61,46,0.1)]" aria-hidden />
        {/* Subtle edge vignette + soft sun-side glow (does not flatten the field) */}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_125%_110%_at_50%_50%,transparent_62%,rgba(0,0,0,0.1)_100%),radial-gradient(ellipse_50%_38%_at_88%_12%,rgba(232,199,95,0.1),transparent_58%)]"
          aria-hidden
        />

        <div className="relative z-10 flex flex-1 flex-col px-4 pt-6 md:px-8 md:pt-8">
          <div className="relative flex w-full flex-col items-center gap-4 text-center md:items-end md:text-right">
            {/* Mobile: menu toggle + slide-down panel */}
            <div className="relative ml-auto md:hidden">
              <button
                type="button"
                className="relative z-[60] inline-flex items-center justify-center rounded-xl border border-white/20 bg-black/35 p-2.5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm transition hover:bg-black/45 active:scale-[0.97]"
                aria-expanded={mobileMenuOpen}
                aria-controls="landing-actions-menu"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                onClick={() => setMobileMenuOpen((open) => !open)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
              </button>

              {mobileMenuOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px]"
                    aria-label="Close menu"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  <motion.nav
                    id="landing-actions-menu"
                    role="navigation"
                    aria-label="Wallet and marketplace"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-50 flex w-[min(100vw-2rem,18rem)] flex-col gap-2 rounded-2xl border border-white/15 bg-black/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl backdrop-blur-md"
                  >
                    <PhantomConnectButton
                      walletAddress={walletAddress}
                      onConnect={connectPhantom}
                      className="group relative isolate w-full justify-center whitespace-normal rounded-xl border border-emerald-300/35 bg-gradient-to-r from-[#0f5132] via-[#166534] to-[#3f6212] px-4 py-3 text-sm font-semibold !text-white shadow-[0_10px_28px_rgba(22,101,52,0.42),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:!text-white hover:shadow-[0_14px_38px_rgba(232,197,71,0.24),0_10px_28px_rgba(22,101,52,0.45)] hover:brightness-110 active:scale-[0.98]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate("/marketplace");
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-white/35 bg-slate-950/90 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:border-amber-200/60 hover:bg-slate-900 active:scale-[0.98]"
                    >
                      <Store className="h-4 w-4 shrink-0 text-amber-200/90" aria-hidden />
                      Open Marketplace
                    </button>
                  </motion.nav>
                </>
              ) : null}
            </div>

            <motion.div
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="hidden w-full max-w-full flex-col items-stretch justify-center gap-2 rounded-2xl border border-white/15 bg-black/20 p-2 backdrop-blur-sm md:flex md:w-auto md:flex-row md:items-center md:justify-end"
            >
              <PhantomConnectButton
                walletAddress={walletAddress}
                onConnect={connectPhantom}
                className="group relative isolate whitespace-nowrap overflow-hidden rounded-xl border border-emerald-300/35 bg-gradient-to-r from-[#0f5132] via-[#166534] to-[#3f6212] px-4 py-2 text-sm font-semibold !text-white shadow-[0_10px_28px_rgba(22,101,52,0.42),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:!text-white hover:shadow-[0_14px_38px_rgba(232,197,71,0.24),0_10px_28px_rgba(22,101,52,0.45)] hover:brightness-110 active:scale-[0.98]"
              />
              <button
                type="button"
                onClick={() => navigate("/marketplace")}
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-white/35 bg-slate-950/90 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:border-amber-200/60 hover:bg-slate-900 active:scale-[0.98]"
              >
                <Store className="h-4 w-4 text-amber-200/90" aria-hidden />
                Open Marketplace
              </button>
            </motion.div>

            {showPhantomInstallPrompt && (
              <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" className="w-full max-w-sm space-y-2 md:max-w-md">
                <a
                  href="https://phantom.app/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-xl border border-violet-300/45 bg-violet-950/90 px-5 py-2.5 text-sm font-semibold text-violet-100 transition hover:bg-violet-900"
                >
                  Install Phantom Wallet
                </a>
                <p className="text-sm text-violet-100/85 [text-shadow:0_1px_12px_rgba(0,0,0,0.5)]">
                  Phantom is required to connect your on-chain farmer identity.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/90 px-4 py-14 backdrop-blur-xl sm:py-16 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-xl font-bold text-white sm:text-2xl">Why teams build on AGRICHAIN</h2>
            <p className="mt-2 text-sm text-slate-300">From field notes to QR verification—minimal friction, maximum clarity.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="group rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-inner shadow-black/20 backdrop-blur-md transition hover:border-emerald-300/25 hover:bg-slate-900/55 hover:shadow-[0_12px_40px_rgba(16,185,129,0.08)]"
              >
                <div className="mb-3 inline-flex rounded-xl bg-gradient-to-br from-emerald-500/25 to-amber-400/15 p-2.5 text-emerald-200 ring-1 ring-white/10">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
