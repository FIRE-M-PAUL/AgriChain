/**
 * Map Supabase/PostgREST errors to actionable UI copy for MVP flows.
 * @param {unknown} error
 * @param {string} fallback
 */
export function mapSupabaseErrorForUser(error, fallback) {
  const msg = typeof error?.message === "string" ? error.message : String(error ?? "");
  const code = typeof error?.code === "string" ? error.code : "";

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

  if (/\bJWT\b/i.test(msg) || /\binvalid api key\b/i.test(msg)) {
    return "Invalid Supabase API key. Use Project Settings → API → anon public key.";
  }

  const trimmed = msg.trim();
  if (!trimmed) return fallback;
  return trimmed.length > 180 ? `${trimmed.slice(0, 177)}…` : trimmed;
}
