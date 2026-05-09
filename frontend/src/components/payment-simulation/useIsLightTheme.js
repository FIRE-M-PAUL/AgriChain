import { useEffect, useState } from "react";

/** Matches app theme toggle: `html.theme-light` class on documentElement. */
export function useIsLightTheme() {
  const [light, setLight] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("theme-light") : false
  );

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setLight(el.classList.contains("theme-light"));
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    sync();
    return () => obs.disconnect();
  }, []);

  return light;
}
