import { supabase, hasSupabaseConfig } from "../lib/supabase";
import { uploadDataUrlPublic } from "./storageUpload";

function ensureClient() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then apply supabase/migrations SQL in your project."
    );
  }
}

function rowToFarmer(row) {
  if (!row) return null;
  return {
    walletAddress: row.wallet_address ?? row.walletAddress,
    farmerName: row.farmer_name ?? row.farmerName ?? "",
    farmName: row.farm_name ?? row.farmName ?? "",
    nationalId: row.national_id ?? row.nationalId ?? "",
    province: row.province ?? "",
    district: row.district ?? "",
    phoneNumber: row.phone_number ?? row.phoneNumber ?? "",
    cropSpecialization: row.crop_specialization ?? row.cropSpecialization ?? "",
    verificationStatus: row.verification_status ?? row.verificationStatus ?? "unverified",
    profileImageUrl: row.profile_image_url ?? "",
    createdAtIso: row.created_at ? new Date(row.created_at).toISOString() : "",
    source: "supabase",
  };
}

export async function getFarmerProfile(walletAddress) {
  if (!walletAddress) return null;
  ensureClient();
  const { data, error } = await supabase.from("farmers").select("*").eq("wallet_address", walletAddress).maybeSingle();
  if (error) throw error;
  return rowToFarmer(data);
}

export async function saveFarmerProfile(profile) {
  ensureClient();
  let profileImageUrl = profile.profileImageUrl || profile.profile_image_url || "";

  if (profileImageUrl.startsWith?.("data:")) {
    const ext = profileImageUrl.startsWith("data:image/png") ? "png" : "jpg";
    const path = `${profile.walletAddress}/avatar-${Date.now()}.${ext}`;
    profileImageUrl = await uploadDataUrlPublic("farmer-profiles", path, profileImageUrl);
  }

  const row = {
    wallet_address: profile.walletAddress,
    farmer_name: profile.farmerName,
    farm_name: profile.farmName,
    national_id: profile.nationalId || "",
    province: profile.province,
    district: profile.district,
    phone_number: profile.phoneNumber,
    crop_specialization: profile.cropSpecialization || "",
    profile_image_url: profileImageUrl || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("farmers").upsert(row, { onConflict: "wallet_address" });
  if (error) throw error;
  return getFarmerProfile(profile.walletAddress);
}

export async function listFarmerProfiles() {
  ensureClient();
  const { data, error } = await supabase.from("farmers").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToFarmer);
}

/**
 * @returns {() => void}
 */
export function subscribeToFarmerChanges(onEvent) {
  if (!supabase || !hasSupabaseConfig) return () => {};
  const channel = supabase
    .channel("mvp-farmers-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "farmers" },
      () => {
        Promise.resolve(onEvent?.()).catch(() => {});
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
