/** @param {unknown} error */
function joinSupabaseParts(error) {
  if (error == null) return "";
  if (typeof error === "string") return error.trim();

  let status = "";
  if (typeof error === "object") {
    if (typeof error.status === "string" && error.status) status = error.status;
    if (typeof error.status === "number" && Number.isFinite(error.status))
      status = String(error.status);
    if (typeof error.statusCode === "number") status = String(error.statusCode);
  }

  const pieces = [];
  if (typeof error === "object" && error !== null) {
    for (const key of ["message", "details", "hint"]) {
      const v = /** @type {Record<string, unknown>} */ (error)[key];
      if (typeof v === "string" && v.trim()) pieces.push(v.trim());
    }
  }
  let text = pieces.join(" — ");
  if (!text && error instanceof Error && error.message) text = error.message.trim();
  if (!text) {
    const s = String(error ?? "").trim();
    if (s && s !== "[object Object]") text = s;
  }
  if (status && !text.toLowerCase().includes("http")) text = text ? `${text} (HTTP ${status})` : `HTTP ${status}`;
  return text.trim();
}

/**
 * Map Supabase/PostgREST errors to actionable UI copy for MVP flows.
 * @param {unknown} error
 * @param {string} fallback
 */
export function mapSupabaseErrorForUser(error, fallback) {
  const msg = joinSupabaseParts(error);
  const code =
    typeof error === "object" &&
    error !== null &&
    typeof /** @type {Record<string, unknown>} */ (error).code === "string"
      ? /** @type {string} */ (/** @type {Record<string, unknown>} */ (error).code)
      : "";

  if (msg.includes("Supabase is not configured")) {
    return "Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (in Vercel → Settings → Environment Variables for production).";
  }

  if (
    code === "PGRST205" ||
    /\bCould not find the table\b/i.test(msg) ||
    /\bschema cache\b/i.test(msg)
  ) {
    return "Supabase is missing the app tables. In Supabase → SQL Editor, run supabase/migrations/20250509120000_agrichain_mvp.sql, then Settings → API → Reload schema.";
  }

  if (code === "42501" || /\bpermission denied\b/i.test(msg)) {
    return "Database blocked this action. Run supabase/migrations/20250509120001_api_grants_mvp.sql (or the full MVP migration) in the SQL Editor.";
  }

  if (
    /\bJWT\b/i.test(msg) ||
    /\binvalid api key\b/i.test(msg) ||
    /\bUnauthorized\b/i.test(msg) ||
    msg.includes("401")
  ) {
    return "Invalid Supabase API key. Use Project Settings → API → anon public key.";
  }

  if (/failed to fetch/i.test(msg) || /network error/i.test(msg) || msg.includes("Load failed"))
    return "Cannot reach Supabase (network). Check VITE_SUPABASE_URL, HTTPS, firewall, or ad blockers.";

  if (msg.includes("404") || msg.includes("NOT_FOUND"))
    return "Supabase REST returned Not Found — usually wrong project URL/rename, or migration not applied. Verify VITE_SUPABASE_URL and Dashboard → Table Editor lists `farmers`.";

  const trimmed = msg.trim();
  if (!trimmed) {
    return `${fallback} Open DevTools → Console for “[AGRICHAIN] saveFarmerProfile”. After a git push, trigger a new Vercel deploy.`;
  }
  return trimmed.length > 180 ? `${trimmed.slice(0, 177)}…` : trimmed;
}
