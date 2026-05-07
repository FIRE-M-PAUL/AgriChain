import BrandLogo from "./BrandLogo";

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-emerald-200/10 bg-slate-950/50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 text-center md:flex-row md:text-left">
        <BrandLogo size="sm" showTagline />
        <p className="text-xs text-slate-400">AGRICHAIN • AI + Blockchain Agricultural Verification Platform</p>
      </div>
    </footer>
  );
}
