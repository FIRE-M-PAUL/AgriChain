import BrandLogo from "./BrandLogo";

export default function Loader() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <BrandLogo size="lg" compact animated />
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent shadow-[0_0_25px_rgba(34,197,94,0.4)]" />
      <p className="text-sm text-emerald-200">Loading AGRICHAIN...</p>
    </div>
  );
}
