/**
 * One-off health check: env + REST reachability for products/farmers.
 * Run: node scripts/verify-supabase-health.mjs (from frontend/)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

function parseDotEnv(content) {
  /** @type {Record<string,string>} */
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

async function poke(baseUrl, key, table, selectColumn = "id") {
  const u = `${baseUrl.replace(/\/+$/, "")}/rest/v1/${encodeURIComponent(
    table
  )}?select=${encodeURIComponent(selectColumn)}&limit=1`;
  const r = await fetch(u, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  const text = await r.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 400);
  }
  return { table, status: r.status, body };
}

const main = async () => {
  if (!fs.existsSync(envPath)) {
    console.error("FAIL: frontend/.env.local missing");
    process.exit(1);
  }
  const env = parseDotEnv(fs.readFileSync(envPath, "utf8"));
  const url = (env.VITE_SUPABASE_URL || "").trim();
  const key = (env.VITE_SUPABASE_ANON_KEY || "").trim();

  if (!url || !key) {
    console.error("FAIL: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  console.log("OK: VITE_SUPABASE_* present in .env.local");

  const products = await poke(url, key, "products", "id");
  const farmers = await poke(url, key, "farmers", "wallet_address");

  console.log(JSON.stringify({ products, farmers }, null, 2));

  if (products.status !== 200 || farmers.status !== 200) {
    const p205 =
      typeof products.body === "object" &&
      products.body?.code === "PGRST205" &&
      typeof farmers.body === "object" &&
      farmers.body?.code === "PGRST205";
    console.error(
      `FAIL: PostgREST products=${products.status}, farmers=${farmers.status}`
    );
    if (p205) {
      console.error(
        "ACTION: Run the SQL migration in Supabase → SQL Editor:",
        path.join(__dirname, "..", "..", "supabase", "migrations", "20250509120000_agrichain_mvp.sql")
      );
    } else if (products.status === 401 || farmers.status === 401) {
      console.error(
        "ACTION: Use the JWT anon key from Dashboard → Settings → API (or fix key)."
      );
    }
    process.exit(1);
  }

  console.log(
    "OK: tables reachable (same as DevTools Network 200 on GET /rest/v1/products & /farmers)"
  );
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
