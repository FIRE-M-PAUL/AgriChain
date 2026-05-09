import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import AppRoutes from "./routes/AppRoutes";
import ErrorBoundary from "./components/ErrorBoundary";
import PaymentSimulationHost from "./components/payment-simulation/PaymentSimulationHost";

const THEME_STORAGE_KEY = "agrichain_theme";

export default function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem(THEME_STORAGE_KEY) || "dark";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (theme === "light") root.classList.add("theme-light");
    else root.classList.remove("theme-light");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ErrorBoundary>
      <AppRoutes />
      <PaymentSimulationHost />
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed z-[100] inline-flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-emerald-300/40 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-emerald-200 shadow-lg backdrop-blur hover:bg-slate-800 bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]"
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        {theme === "light" ? "Dark Mode" : "Light Mode"}
      </button>
    </ErrorBoundary>
  );
}
