import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Mic, QrCode as QrCodeIcon, Download, Share2 } from "lucide-react";
import { generateProductId, listProducts, saveProductRecord } from "../services/mvpProducts";
import { getFarmerProfile, saveFarmerProfile } from "../services/mvpFarmers";
import { startVoiceCapture } from "../services/voiceInput";
import { buildCropHash, recordSolanaProof } from "../services/solanaProof";
import PhantomConnectButton from "../components/PhantomConnectButton";
import { useAuth } from "../context/AuthContext";
import { getStoredWalletAddress, setStoredWalletAddress } from "../services/walletSession";
import { formatNrcInput, isValidNrc } from "../utils/nrc";
import { formatPhoneTenDigits, isValidPhoneTenDigits } from "../utils/phoneTen";
import { mapSupabaseErrorForUser } from "../utils/supabaseErrors";
import { ReactQRCode, canRenderReactQRCode } from "../lib/reactQrCode";

function getPhantomProvider() {
  if (typeof window === "undefined") return null;
  const provider = window.solana;
  if (!provider || !provider.isPhantom) return null;
  return provider;
}

export default function MvpFarmerPage() {
  const navigate = useNavigate();
  const { disconnectWallet } = useAuth();
  const [walletAddress, setWalletAddress] = useState(getStoredWalletAddress());
  const [cropName, setCropName] = useState("");
  const [quantityAvailable, setQuantityAvailable] = useState("");
  const [unitType, setUnitType] = useState("Bags");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [nrcTouched, setNrcTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    farmerName: "",
    farmName: "",
    nationalId: "",
    province: "",
    district: "",
    phoneNumber: "",
    cropSpecialization: "",
  });
  const [createdRecord, setCreatedRecord] = useState(null);
  const [farmerProducts, setFarmerProducts] = useState([]);
  const nrcValid = isValidNrc(profileForm.nationalId);
  const showNrcError = nrcTouched && !nrcValid;
  const phoneValid = isValidPhoneTenDigits(profileForm.phoneNumber);
  const showPhoneError = phoneTouched && !phoneValid;

  const scanUrl = createdRecord ? `${window.location.origin}/scan?id=${createdRecord.id}` : "";
  const farmerSalesSummary = useMemo(() => {
    const products = farmerProducts.filter((item) => item.walletAddress === walletAddress || item.farmerWallet === walletAddress);
    const soldUnits = products.reduce((sum, item) => sum + (Number(item.soldQuantity) || 0), 0);
    const remainingUnits = products.reduce((sum, item) => sum + (Number(item.quantityAvailable) || 0), 0);
    const txCount = products.reduce((sum, item) => sum + (item.purchases?.length || 0), 0);
    const purchaseRecords = products.flatMap((item) => (item.purchases || []).map((purchase) => ({ ...purchase, productId: item.id, cropName: item.cropName })));
    return { soldUnits, remainingUnits, txCount, purchaseRecords };
  }, [farmerProducts, walletAddress]);

  useEffect(() => {
    if (!walletAddress) return;
    listProducts()
      .then((items) => setFarmerProducts(items))
      .catch(() => setFarmerProducts([]));
  }, [walletAddress, createdRecord]);

  const connectWallet = async () => {
    const provider = getPhantomProvider();
    if (!provider) {
      toast.error("Phantom wallet not found. Install Phantom to continue.");
      return;
    }
    try {
      const response = await provider.connect();
      const address = response?.publicKey?.toString?.() || provider.publicKey?.toString?.() || "";
      if (!address) throw new Error("Could not read connected wallet address.");
      setWalletAddress(address);
      setStoredWalletAddress(address);
      toast.success("Phantom wallet connected.");
      try {
        const existing = await getFarmerProfile(address);
        if (existing) setProfile(existing);
      } catch (profileErr) {
        console.error("[AGRICHAIN] farmer profile fetch after connect:", profileErr);
        toast.error(
          mapSupabaseErrorForUser(profileErr, "Could not load farmer profile from Supabase.")
        );
      }
    } catch (connectErr) {
      console.error("[AGRICHAIN] Phantom connect:", connectErr);
      toast.error("Wallet connection failed.");
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!walletAddress) {
      toast.error("Connect Phantom first.");
      return;
    }
    const required = ["farmerName", "farmName", "nationalId", "province", "district", "phoneNumber"];
    const missing = required.some((key) => !String(profileForm[key] || "").trim());
    if (missing) {
      toast.error("Fill all required profile fields.");
      return;
    }
    setNrcTouched(true);
    if (!nrcValid) {
      toast.error("Please enter a valid NRC number.");
      return;
    }
    setPhoneTouched(true);
    if (!phoneValid) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }
    setIsSavingProfile(true);
    try {
      const saved = await saveFarmerProfile({
        walletAddress,
        ...profileForm,
      });
      setProfile(saved);
      toast.success("Farmer profile saved.");
    } catch (err) {
      console.error("[AGRICHAIN] saveFarmerProfile:", err);
      toast.error(mapSupabaseErrorForUser(err, "Could not save farmer profile."));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const triggerVoiceInput = () => {
    setIsRecording(true);
    const recognition = startVoiceCapture({
      onResult: ({ transcript, parsed }) => {
        if (parsed.cropName) setCropName(parsed.cropName);
        if (parsed.quantity) setQuantityAvailable(parsed.quantity.replace(/[^\d.]/g, ""));
        setIsRecording(false);
        toast.success(`Voice captured: "${transcript}"`);
      },
      onError: (message) => {
        setIsRecording(false);
        toast.error(message);
      },
    });
    if (!recognition) {
      setIsRecording(false);
    }
  };

  const generateQr = async (event) => {
    event.preventDefault();
    if (!walletAddress) {
      toast.error("Connect your Phantom wallet first.");
      return;
    }
    if (!profile) {
      toast.error("Complete your farmer profile first.");
      return;
    }
    if (!cropName.trim() || !quantityAvailable.trim() || !pricePerUnit.trim()) {
      toast.error("Enter crop name, quantity, and price per unit.");
      return;
    }
    const numericQuantity = Number(quantityAvailable);
    const numericPrice = Number(pricePerUnit);
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      toast.error("Quantity must be greater than zero.");
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      toast.error("Price per unit must be greater than zero.");
      return;
    }

    setIsSubmitting(true);
    try {
      const id = generateProductId();
      const cropHash = await buildCropHash({
        productId: id,
        cropName: cropName.trim(),
        quantity: `${numericQuantity} ${unitType}`,
        walletAddress,
      });
      const proof = await recordSolanaProof({
        productId: id,
        walletAddress,
        cropHashBytes: cropHash.bytes,
      });
      const payload = {
        id,
        cropName: cropName.trim(),
        quantity: `${numericQuantity} ${unitType}`,
        quantityAvailable: numericQuantity,
        unitType: unitType.trim() || "units",
        pricePerUnit: numericPrice,
        soldQuantity: 0,
        totalTransactions: 0,
        inventoryStatus: "available",
        imageUrl: imageDataUrl,
        walletAddress,
        farmerReference: walletAddress,
        farmerProfile: profile,
        qrCode: `${window.location.origin}/scan?id=${id}`,
        cropHash: cropHash.hex,
        solanaProofPda: proof.proofPda,
        blockchainSignature: proof.signature,
        blockchainTimestamp: proof.timestamp,
        blockchainExplorerUrl: proof.explorerUrl,
      };
      const saved = await saveProductRecord(payload);
      setCreatedRecord(saved);
      toast.success(`Product recorded (${saved.source === "supabase" ? "Supabase" : saved.source}).`);
    } catch {
      toast.error("Failed to record crop.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadQr = () => {
    const svg = document.getElementById("agrichain-qr-svg");
    if (!svg || !createdRecord) return;
    const serializer = new XMLSerializer();
    const svgData = serializer.serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${createdRecord.id}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const shareQr = async () => {
    if (!scanUrl) return;
    try {
      await navigator.clipboard.writeText(scanUrl);
      toast.success("Scan link copied.");
    } catch {
      toast.error("Could not copy scan link.");
    }
  };

  const onImageUploadChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageDataUrl("");
      return;
    }
    if (!file.type?.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => {
      toast.error("Could not read image file.");
    };
    reader.readAsDataURL(file);
  };

  /** Ends session: Phantom disconnect + clears stored wallet/role keys (aligned with AuthContext). */
  const logout = async () => {
    await disconnectWallet();
    setWalletAddress("");
    setProfile(null);
    setFarmerProducts([]);
    setCreatedRecord(null);
    toast.success("Logged out. Wallet disconnected.");
    navigate("/");
  };

  return (
    <main className="min-h-screen min-w-0 bg-slate-950 px-4 py-8 pb-24 text-slate-100 sm:pb-8">
      <div className="mx-auto max-w-4xl min-w-0 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="min-w-0 shrink text-xl font-bold text-white sm:text-2xl">Farmer Crop Recorder</h1>
          {walletAddress ? (
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-rose-300/40 px-3 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/10"
            >
              Logout
            </button>
          ) : null}
        </div>

        <section className="glass rounded-2xl p-5">
          <PhantomConnectButton walletAddress={walletAddress} onConnect={connectWallet} />
        </section>

        {!profile && walletAddress ? (
          <section className="glass rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-white">Farmer Profile Setup</h2>
            <p className="mt-1 text-xs text-slate-400">Profile is required once to build buyer trust and link products to real farm identity.</p>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={saveProfile}>
              <input className="rounded-xl bg-slate-900 p-3 text-sm" placeholder="Full name *" value={profileForm.farmerName} onChange={(e) => setProfileForm((p) => ({ ...p, farmerName: e.target.value }))} />
              <input className="rounded-xl bg-slate-900 p-3 text-sm" placeholder="Farm name *" value={profileForm.farmName} onChange={(e) => setProfileForm((p) => ({ ...p, farmName: e.target.value }))} />
              <div className="space-y-1">
                <input
                  className={`w-full rounded-xl border p-3 text-sm ${
                    showNrcError
                      ? "border-rose-300/60 bg-rose-500/10 text-rose-100"
                      : nrcTouched && nrcValid
                      ? "border-emerald-300/50 bg-emerald-500/10 text-emerald-100"
                      : "border-transparent bg-slate-900 text-white"
                  }`}
                  placeholder="000000/00/0"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  value={profileForm.nationalId}
                  onBlur={() => setNrcTouched(true)}
                  onChange={(e) =>
                    setProfileForm((p) => ({
                      ...p,
                      nationalId: formatNrcInput(e.target.value),
                    }))
                  }
                />
                {showNrcError ? (
                  <p className="text-xs text-rose-300">Please enter a valid NRC number.</p>
                ) : (
                  <p className="text-xs text-slate-400">Format: 000000/00/0</p>
                )}
              </div>
              <input className="rounded-xl bg-slate-900 p-3 text-sm" placeholder="Province *" value={profileForm.province} onChange={(e) => setProfileForm((p) => ({ ...p, province: e.target.value }))} />
              <input className="rounded-xl bg-slate-900 p-3 text-sm" placeholder="District *" value={profileForm.district} onChange={(e) => setProfileForm((p) => ({ ...p, district: e.target.value }))} />
              <div className="space-y-1">
                <input
                  className={`w-full rounded-xl border p-3 text-sm ${
                    showPhoneError
                      ? "border-rose-300/60 bg-rose-500/10 text-rose-100"
                      : phoneTouched && phoneValid
                        ? "border-emerald-300/50 bg-emerald-500/10 text-emerald-100"
                        : "border-transparent bg-slate-900 text-white"
                  }`}
                  placeholder="Phone number (10 digits) *"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  value={profileForm.phoneNumber}
                  onBlur={() => setPhoneTouched(true)}
                  onChange={(e) =>
                    setProfileForm((p) => ({
                      ...p,
                      phoneNumber: formatPhoneTenDigits(e.target.value),
                    }))
                  }
                />
                {showPhoneError ? (
                  <p className="text-xs text-rose-300">Enter exactly 10 digits (numbers only).</p>
                ) : (
                  <p className="text-xs text-slate-400">10 digits — spaces and symbols are stripped.</p>
                )}
              </div>
              <input className="rounded-xl bg-slate-900 p-3 text-sm" placeholder="Crop specialization" value={profileForm.cropSpecialization} onChange={(e) => setProfileForm((p) => ({ ...p, cropSpecialization: e.target.value }))} />
              <button disabled={isSavingProfile} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-400 disabled:opacity-70 sm:col-span-2">
                {isSavingProfile ? "Saving profile..." : "Save Farmer Profile"}
              </button>
            </form>
          </section>
        ) : null}

        {profile ? (
          <section className="glass rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-white">Farmer Identity (Wallet Linked)</h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <p>Farmer: <span className="text-white">{profile.farmerName}</span></p>
              <p>Farm: <span className="text-white">{profile.farmName}</span></p>
              <p>Province: <span className="text-white">{profile.province}</span></p>
              <p>District: <span className="text-white">{profile.district}</span></p>
              <p>Phone: <span className="text-white">{profile.phoneNumber}</span></p>
              <p>Specialization: <span className="text-white">{profile.cropSpecialization || "Not set"}</span></p>
            </div>
          </section>
        ) : null}

        <section className="glass rounded-2xl p-5">
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={generateQr}>
            <label className="space-y-1">
              <span className="text-xs text-slate-400">Crop name</span>
              <input value={cropName} onChange={(e) => setCropName(e.target.value)} className="w-full rounded-xl bg-slate-900 p-3 text-sm" placeholder="Maize" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-400">Quantity Available</span>
              <input type="number" min="1" value={quantityAvailable} onChange={(e) => setQuantityAvailable(e.target.value)} className="w-full rounded-xl bg-slate-900 p-3 text-sm" placeholder="50" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-400">Unit Type</span>
              <input value={unitType} onChange={(e) => setUnitType(e.target.value)} className="w-full rounded-xl bg-slate-900 p-3 text-sm" placeholder="Bags" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-400">Price Per Unit</span>
              <input type="number" min="0.0001" step="0.0001" value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)} className="w-full rounded-xl bg-slate-900 p-3 text-sm" placeholder="3" />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-slate-400">Image Upload (Optional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={onImageUploadChange}
                className="w-full rounded-xl bg-slate-900 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-900"
              />
              {imageDataUrl ? (
                <img src={imageDataUrl} alt="Crop preview" className="h-24 w-24 rounded-xl object-cover ring-1 ring-emerald-300/30" />
              ) : (
                <p className="text-xs text-slate-500">No image selected.</p>
              )}
            </label>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <button type="button" onClick={triggerVoiceInput} className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/10">
                <Mic className={`h-4 w-4 ${isRecording ? "animate-pulse" : ""}`} />
                {isRecording ? "Listening..." : "Voice Input"}
              </button>
              <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-70">
                <QrCodeIcon className="h-4 w-4" />
                {isSubmitting ? "Generating..." : "Generate QR"}
              </button>
            </div>
          </form>
        </section>

        {profile ? (
          <section className="glass rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-white">Inventory & Sales Overview</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
              <p className="rounded-xl bg-slate-900/70 p-3 text-slate-300">Total products sold: <span className="text-white">{farmerSalesSummary.soldUnits}</span></p>
              <p className="rounded-xl bg-slate-900/70 p-3 text-slate-300">Remaining inventory: <span className="text-white">{farmerSalesSummary.remainingUnits}</span></p>
              <p className="rounded-xl bg-slate-900/70 p-3 text-slate-300">Transactions: <span className="text-white">{farmerSalesSummary.txCount}</span></p>
            </div>
            <div className="mt-3 space-y-2">
              {farmerSalesSummary.purchaseRecords.slice(-5).reverse().map((purchase) => (
                <div key={`${purchase.signature}-${purchase.purchasedAtIso}`} className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-xs text-slate-300">
                  <p className="break-words">Product: <span className="text-white">{purchase.cropName}</span> ({purchase.productId})</p>
                  <p className="break-all">Buyer: <span className="font-mono text-white">{purchase.buyerWallet || "Unknown"}</span></p>
                  <p>Quantity: <span className="text-white">{purchase.quantityPurchased || 0} {purchase.unitType || "units"}</span></p>
                  <p>Payment: <span className="text-white">{Number(purchase.totalPaymentSol || 0).toFixed(4)} SOL</span></p>
                </div>
              ))}
              {!farmerSalesSummary.purchaseRecords.length ? <p className="text-xs text-slate-400">No purchase records yet.</p> : null}
            </div>
          </section>
        ) : null}

        {createdRecord ? (
          <section className="glass rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-white">Crop QR Generated</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[220px,1fr]">
              <div className="mx-auto w-fit max-w-full rounded-xl bg-white p-4 sm:mx-0">
                {canRenderReactQRCode() ? (
                  <ReactQRCode id="agrichain-qr-svg" value={scanUrl} size={180} />
                ) : (
                  <p className="text-xs text-slate-600">QR preview unavailable (bundle interop).</p>
                )}
              </div>
              <div className="min-w-0 space-y-2 text-sm text-slate-300">
                <p className="break-words">Product ID: <span className="break-all font-mono text-white">{createdRecord.id}</span></p>
                <p>Crop: {createdRecord.cropName}</p>
                <p>Quantity: {createdRecord.quantityAvailable} {createdRecord.unitType}</p>
                <p>Price per unit: {Number(createdRecord.pricePerUnit || 0).toFixed(4)} SOL</p>
                <p>Status: {createdRecord.inventoryStatus === "sold_out" ? "Sold Out" : "Available"}</p>
                <p className="break-all">Wallet: <span className="font-mono">{createdRecord.walletAddress}</span></p>
                <p>Blockchain proof: {createdRecord.blockchainSignature ? "Recorded on Solana" : "Skipped (wallet or network unavailable)"}</p>
                {createdRecord.blockchainExplorerUrl ? (
                  <a href={createdRecord.blockchainExplorerUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 hover:text-cyan-200">
                    View transaction on Solana Explorer
                  </a>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button onClick={downloadQr} className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10">
                    <Download className="h-3.5 w-3.5" />
                    Download QR
                  </button>
                  <button onClick={shareQr} className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10">
                    <Share2 className="h-3.5 w-3.5" />
                    Share QR
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
