import { supabase, hasSupabaseConfig } from "../lib/supabase";

const DATA_URL = /^data:([^;]+);base64,(.+)$/;

/**
 * Converts a canvas/data URL crop image into a Supabase Storage public URL when possible.
 * Returns original value if already http(s) or Supabase unavailable.
 */
export async function uploadDataUrlPublic(bucketId, storagePath, dataUrlOrUrl) {
  if (!hasSupabaseConfig || !supabase || !dataUrlOrUrl) return dataUrlOrUrl || "";
  const trimmed = String(dataUrlOrUrl).trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;

  const m = DATA_URL.exec(trimmed);
  if (!m) return trimmed;

  const contentType = m[1];
  const b64 = m[2];
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  const { error: upErr } = await supabase.storage.from(bucketId).upload(storagePath, bin, {
    contentType,
    upsert: true,
  });

  if (upErr) {
    console.error("[AGRICHAIN] Storage upload failed", bucketId, upErr.message);
    return trimmed;
  }

  const { data } = supabase.storage.from(bucketId).getPublicUrl(storagePath);
  return data?.publicUrl || trimmed;
}
