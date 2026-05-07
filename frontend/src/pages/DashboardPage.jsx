import { useMemo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Activity,
  BookOpenText,
  Box,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link as LinkIcon,
  PackageCheck,
  Upload,
  QrCode,
  X,
  Truck,
  Wallet,
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import QRDisplay from "../components/QRDisplay";
import SkeletonCard from "../components/SkeletonCard";
import Sidebar from "../components/Sidebar";
import AnalyticsCard from "../components/dashboard/AnalyticsCard";
import BrandLogo from "../components/BrandLogo";
import NotificationCard from "../components/dashboard/NotificationCard";
import ProductTimeline from "../components/dashboard/ProductTimeline";
import RecentProductsTable from "../components/dashboard/RecentProductsTable";
import StatusBadge from "../components/dashboard/StatusBadge";
import { productService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatNrcInput, getCaretFromDigitCount, getDigitCountBeforeCaret, isValidNrc } from "../utils/nrc";

export default function DashboardPage() {
  const allowedFarmImageTypes = ["image/jpeg", "image/png", "image/webp"];
  const [form, setForm] = useState({ crop_name: "", quantity: "", description: "" });
  const [verificationForm, setVerificationForm] = useState({
    farm_name: "",
    province: "",
    district: "",
    farm_description: "",
    national_id: "",
    cooperative_card_id: "",
    agricultural_license_id: "",
    claimed_crop: "",
    crop_image_url: "",
    harvest_image_url: "",
  });
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [nrcTouched, setNrcTouched] = useState(false);
  const [verificationUploadProgress, setVerificationUploadProgress] = useState(0);
  const [farmImageFile, setFarmImageFile] = useState(null);
  const [farmImagePreview, setFarmImagePreview] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [latest, setLatest] = useState(null);
  const [profileStats, setProfileStats] = useState({ joinedDate: "Today", blockchainState: "Active" });
  const nationalIdInputRef = useRef(null);
  const nextNrcCaretRef = useRef(null);
  const { walletAddress, disconnectWallet, submitFarmerVerification, profile } = useAuth();
  const nrcValid = isValidNrc(verificationForm.national_id);
  const showNrcError = nrcTouched && !nrcValid;

  const loadProducts = async () => {
    try {
      setListLoading(true);
      const res = await productService.list();
      setProducts(res.data);
    } catch {
      toast.error("Could not load products");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await productService.create({
        crop_name: form.crop_name,
        quantity: Number(form.quantity),
        description: form.description,
      });
      setLatest(res.data);
      setForm({ crop_name: "", quantity: "", description: "" });
      toast.success("Crop recorded and QR generated");
      loadProducts();
    } catch {
      toast.error("Failed to create product. Login may be required.");
    } finally {
      setLoading(false);
    }
  };

  const qrValue = latest ? `${window.location.origin}/products/${latest.unique_code}` : "";
  const totalProducts = products.length;
  const totalQuantity = products.reduce((sum, item) => sum + item.quantity, 0);
  const totalScans = products.reduce((sum, item) => sum + (item.scan_count || 0), 0);
  const aiVerifiedCount = products.filter((p) => String(p.ai_status || "").toLowerCase().includes("verify")).length;
  const chainVerifiedCount = products.filter((p) => String(p.blockchain_status || "").toLowerCase().includes("verify")).length;
  const inTransitCount = products.filter((p) => String(p.delivery_status || "").toLowerCase().includes("transit")).length;
  const deliveredCount = products.filter((p) => String(p.delivery_status || "").toLowerCase().includes("deliver")).length;

  useEffect(() => {
    setProfileStats({
      joinedDate: totalProducts ? new Date(products[products.length - 1].created_at).toLocaleDateString() : "Today",
      blockchainState: chainVerifiedCount > 0 ? "Verified Activity" : "Awaiting Verification",
    });
  }, [products, totalProducts, chainVerifiedCount]);

  const notifications = [
    { id: "n1", title: "AI verification completed", message: "Maize Batch MZ-23 scored 97% confidence.", time: "2 minutes ago", status: "verified" },
    { id: "n2", title: "Buyer scanned product QR", message: "Tomato Batch TM-11 was scanned in Nairobi.", time: "22 minutes ago", status: "active" },
    { id: "n3", title: "Blockchain confirmation", message: "Product hash confirmed on smart contract.", time: "1 hour ago", status: "verified" },
  ];

  const timelineSteps = [
    { id: "t1", title: "Product Recorded", description: "Core crop metadata and quantity captured.", done: totalProducts > 0 },
    { id: "t2", title: "AI Verified", description: "Image and crop authenticity evaluated.", done: aiVerifiedCount > 0 },
    { id: "t3", title: "Blockchain Verified", description: "Hash anchored with smart-contract proof.", done: chainVerifiedCount > 0 },
    { id: "t4", title: "In Transit", description: "Batch moved to distribution network.", done: inTransitCount > 0 },
    { id: "t5", title: "Delivered", description: "Batch reached final buyer destination.", done: deliveredCount > 0 },
  ];

  const blockchainItems = products.slice(0, 4).map((product) => ({
    id: product.id,
    hash: `0x${(product.unique_code || "").padEnd(24, "0").slice(0, 24)}...`,
    state: product.blockchain_status || "pending",
    timestamp: new Date(product.created_at).toLocaleString(),
  }));

  const chartRows = useMemo(() => {
    if (!products.length) return [{ name: "No Data", value: 0 }];
    return products.slice(0, 6).map((item) => ({ name: item.crop_name, value: Number(item.quantity) || 0 }));
  }, [products]);

  const maxChartValue = Math.max(...chartRows.map((item) => item.value), 1);

  const copyWallet = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      toast.success("Wallet copied");
    } catch {
      toast.error("Could not copy wallet");
    }
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
    toast.success("Wallet disconnected");
  };

  const handleViewProduct = (product) => toast.success(`Viewing ${product.crop_name}`);

  const handleDownloadQr = (product) => {
    const qrLink = `${window.location.origin}/products/${product.unique_code}`;
    navigator.clipboard.writeText(qrLink).then(
      () => toast.success("QR link copied for sharing/printing"),
      () => toast.error("Could not copy QR link")
    );
  };

  const handleVerificationSubmit = async (event) => {
    event.preventDefault();
    setNrcTouched(true);
    if (!nrcValid) {
      toast.error("Enter a valid NRC in format XXXXXX/XX/X");
      return;
    }
    try {
      setVerificationLoading(true);
      setVerificationUploadProgress(0);
      const payload = new FormData();
      Object.entries(verificationForm).forEach(([key, value]) => {
        payload.append(key, value ?? "");
      });
      if (farmImageFile) {
        payload.append("farm_image", farmImageFile);
      }
      await submitFarmerVerification(payload, (progressEvent) => {
        const total = progressEvent.total || 1;
        const percent = Math.round((progressEvent.loaded / total) * 100);
        setVerificationUploadProgress(percent);
      });
      toast.success("Farmer verification submitted");
    } catch (error) {
      toast.error(error?.response?.data?.detail || error.message || "Could not submit farmer verification");
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleNationalIdChange = (event) => {
    const { value, selectionStart } = event.target;
    const digitCountBeforeCaret = getDigitCountBeforeCaret(value, selectionStart ?? value.length);
    const formattedNrc = formatNrcInput(value);
    nextNrcCaretRef.current = getCaretFromDigitCount(formattedNrc, digitCountBeforeCaret);
    setVerificationForm((prev) => ({ ...prev, national_id: formattedNrc }));
  };

  useEffect(() => {
    if (nextNrcCaretRef.current === null || !nationalIdInputRef.current) {
      return;
    }
    const targetCaret = nextNrcCaretRef.current;
    nextNrcCaretRef.current = null;
    requestAnimationFrame(() => {
      nationalIdInputRef.current?.setSelectionRange(targetCaret, targetCaret);
    });
  }, [verificationForm.national_id]);

  const clearFarmImage = () => {
    setFarmImageFile(null);
    setFarmImagePreview("");
  };

  const validateAndSetFarmImage = (file) => {
    if (!file) return;
    if (!allowedFarmImageTypes.includes(file.type)) {
      toast.error("Invalid file type. Use JPG, JPEG, PNG, or WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size too large. Maximum allowed size is 5MB.");
      return;
    }
    setFarmImageFile(file);
    setFarmImagePreview(URL.createObjectURL(file));
    toast.success("Farm image uploaded successfully");
  };

  const onFarmImageInput = (event) => {
    const file = event.target.files?.[0];
    validateAndSetFarmImage(file);
  };

  const onFarmImageDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    validateAndSetFarmImage(file);
  };

  useEffect(() => {
    return () => {
      if (farmImagePreview) {
        URL.revokeObjectURL(farmImagePreview);
      }
    };
  }, [farmImagePreview]);

  return (
    <MainLayout>
      <div className="grid gap-6 lg:grid-cols-[240px,1fr]">
        <Sidebar />
        <div className="space-y-6">
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border border-emerald-300/20 bg-gradient-to-br from-emerald-500/20 via-slate-900/60 to-slate-950/80">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <BrandLogo size="sm" showTagline className="mb-2" />
                  <p className="text-xs uppercase tracking-wide text-emerald-200/90">Farmer Profile Overview</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">AGRICHAIN Farmer Control Center</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge label="Connected" />
                    <StatusBadge label="Farmer Verified" />
                    <StatusBadge label={profileStats.blockchainState} />
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-xs text-slate-300">
                    <Wallet className="h-4 w-4 text-emerald-300" />
                    {walletAddress || "Wallet not connected"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Joined: {profileStats.joinedDate}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:min-w-[280px]">
                  <Card className="border border-white/10 bg-slate-900/50 p-4">
                    <p className="text-xs text-slate-400">Total products</p>
                    <p className="text-2xl font-bold text-white">{totalProducts}</p>
                  </Card>
                  <Card className="border border-white/10 bg-slate-900/50 p-4">
                    <p className="text-xs text-slate-400">Total quantity</p>
                    <p className="text-2xl font-bold text-emerald-300">{totalQuantity}kg</p>
                  </Card>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="rounded-xl border border-emerald-300/40 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-500/10" onClick={copyWallet}>
                  <Copy className="mr-1 inline h-3.5 w-3.5" /> Copy wallet
                </button>
                <button className="rounded-xl border border-rose-300/40 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/10" onClick={handleDisconnect}>
                  Disconnect wallet
                </button>
              </div>
            </Card>
          </motion.section>

          <section>
            <Card className="border border-amber-300/20 bg-amber-500/5">
              <h3 className="text-lg font-semibold text-white">Farmer Verification Workflow</h3>
              <p className="mt-1 text-xs text-slate-300">
                Current level: <span className="text-amber-300">{profile?.verification_level || 1}</span>. Submit farm identity and proof data to progress toward verified farmer trust.
              </p>
              <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleVerificationSubmit}>
                <input className="rounded-xl bg-slate-900 p-3 text-sm" placeholder="Farm name" required value={verificationForm.farm_name} onChange={(e) => setVerificationForm((prev) => ({ ...prev, farm_name: e.target.value }))} />
                <input className="rounded-xl bg-slate-900 p-3 text-sm" placeholder="Province" required value={verificationForm.province} onChange={(e) => setVerificationForm((prev) => ({ ...prev, province: e.target.value }))} />
                <input className="rounded-xl bg-slate-900 p-3 text-sm" placeholder="District" required value={verificationForm.district} onChange={(e) => setVerificationForm((prev) => ({ ...prev, district: e.target.value }))} />
                <div className="space-y-1">
                  <input
                    ref={nationalIdInputRef}
                    className={`w-full rounded-xl border p-3 text-sm transition ${
                      showNrcError
                        ? "border-rose-300/60 bg-rose-500/10 text-rose-100 focus:border-rose-300"
                        : nrcTouched && nrcValid
                        ? "border-emerald-300/50 bg-emerald-500/10 text-emerald-100 focus:border-emerald-300"
                        : "border-transparent bg-slate-900 text-white focus:border-cyan-300/50"
                    }`}
                    placeholder="000000/00/0"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={11}
                    required
                    value={verificationForm.national_id}
                    onChange={handleNationalIdChange}
                    onBlur={() => setNrcTouched(true)}
                    aria-invalid={showNrcError}
                  />
                  {showNrcError ? (
                    <p className="text-xs text-rose-300">National ID / NRC must match XXXXXX/XX/X (example: 608486/37/5).</p>
                  ) : nrcTouched && nrcValid ? (
                    <p className="text-xs text-emerald-300">NRC format looks valid.</p>
                  ) : (
                    <p className="text-xs text-slate-400">Format: XXXXXX/XX/X</p>
                  )}
                </div>
                <input className="rounded-xl bg-slate-900 p-3 text-sm" placeholder="Claimed crop type" value={verificationForm.claimed_crop} onChange={(e) => setVerificationForm((prev) => ({ ...prev, claimed_crop: e.target.value }))} />
                <textarea className="rounded-xl bg-slate-900 p-3 text-sm" rows={1} placeholder="Farm description" value={verificationForm.farm_description} onChange={(e) => setVerificationForm((prev) => ({ ...prev, farm_description: e.target.value }))} />
                <div className="md:col-span-2">
                  <div
                    className="rounded-2xl border border-dashed border-emerald-300/35 bg-slate-900/50 p-4 text-center shadow-[0_0_18px_rgba(34,197,94,0.12)]"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={onFarmImageDrop}
                  >
                    <label className="cursor-pointer">
                      <div className="mx-auto mb-2 inline-flex rounded-full bg-emerald-500/20 p-2 text-emerald-300">
                        <Upload className="h-4 w-4" />
                      </div>
                      <p className="text-sm text-white">Upload farm image</p>
                      <p className="mt-1 text-xs text-slate-300">Drag and drop, or tap to choose from camera/gallery (JPG, PNG, WEBP)</p>
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFarmImageInput} />
                    </label>
                  </div>
                  {farmImagePreview ? (
                    <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/60 p-3">
                      <img src={farmImagePreview} alt="Farm preview" className="h-40 w-full rounded-lg object-cover" />
                      <button type="button" onClick={clearFarmImage} className="mt-2 rounded-lg border border-rose-300/40 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/10">
                        <X className="mr-1 inline h-3.5 w-3.5" />
                        Remove image
                      </button>
                    </div>
                  ) : null}
                  {verificationLoading ? (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-300">
                        <span>Upload progress</span>
                        <span>{verificationUploadProgress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${verificationUploadProgress}%` }} />
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="md:col-span-2">
                  <Button className="px-4 py-2" disabled={verificationLoading}>
                    {verificationLoading ? "Submitting..." : "Submit Farmer Verification"}
                  </Button>
                </div>
              </form>
            </Card>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AnalyticsCard title="Total Products Registered" value={totalProducts} subtitle="All batches in AGRICHAIN" icon={Box} trend="+12% this month" />
            <AnalyticsCard title="Total QR Scans" value={totalScans} subtitle="Buyer and inspector scans" icon={QrCode} trend="+18% this week" />
            <AnalyticsCard title="AI Verified Products" value={aiVerifiedCount} subtitle="Machine-verified crop entries" icon={CheckCircle2} trend="Live AI confidence tracking" />
            <AnalyticsCard title="Blockchain Verified" value={chainVerifiedCount} subtitle="On-chain verified records" icon={LinkIcon} trend="Hash validation active" />
            <AnalyticsCard title="Products In Transit" value={inTransitCount} subtitle="Logistics in progress" icon={Truck} trend="Realtime distribution updates" />
            <AnalyticsCard title="Products Delivered" value={deliveredCount} subtitle="Completed delivery cycles" icon={PackageCheck} trend="Verified destination arrival" />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="text-lg font-semibold text-white">AI Verification Center</h3>
              <p className="mt-1 text-xs text-slate-300">Crop image analysis, confidence scoring, and authenticity insights.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-300/20 bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-400">Latest analysis</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-300">AI Verified</p>
                  <p className="mt-1 text-xs text-slate-300">Crop detected: {latest?.crop_name || "Maize"}</p>
                </div>
                <div className="rounded-xl border border-cyan-300/20 bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-400">Confidence score</p>
                  <p className="mt-1 text-sm font-semibold text-cyan-300">{latest ? "97%" : "0%"}</p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <motion.div initial={{ width: 0 }} animate={{ width: latest ? "97%" : "8%" }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-white">Product Tracking Timeline</h3>
              <p className="mt-1 text-xs text-slate-300">Lifecycle progress from record creation to delivery.</p>
              <div className="mt-4">
                <ProductTimeline steps={timelineSteps} />
              </div>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="text-lg font-semibold text-white">Blockchain Activity Panel</h3>
              <p className="mt-1 text-xs text-slate-300">Recent transaction proofs and smart contract confirmations.</p>
              <div className="mt-4 space-y-3">
                {(blockchainItems.length ? blockchainItems : [{ id: "none", hash: "No transaction yet", state: "pending", timestamp: "Waiting for product record" }]).map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-xs text-slate-200">{item.hash}</p>
                      <StatusBadge label={item.state} />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">{item.timestamp}</p>
                  </div>
                ))}
              </div>
              <button className="mt-4 rounded-xl border border-cyan-300/40 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/10">
                <ExternalLink className="mr-1 inline h-3.5 w-3.5" />
                View on Blockchain Explorer
              </button>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-white">QR Code Management Center</h3>
              <p className="mt-1 text-xs text-slate-300">Preview, download, print, and share QR verification assets.</p>
              <div className="mt-4">
                <QRDisplay value={qrValue} product={latest} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button className="bg-emerald-400 px-3 py-2 text-xs">Download QR</Button>
                <button className="rounded-xl border border-white/20 px-3 py-2 text-xs text-slate-200 hover:bg-white/10">Print Label</button>
                <button className="rounded-xl border border-white/20 px-3 py-2 text-xs text-slate-200 hover:bg-white/10">Share Link</button>
              </div>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
            <Card>
              <h3 className="mb-3 text-lg font-semibold text-white">Recent Products Table</h3>
              {listLoading ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : products.length === 0 ? (
                <div className="space-y-3 text-center">
                  <div className="flex justify-center">
                    <BrandLogo size="md" compact />
                  </div>
                  <p className="text-slate-300">No crops recorded yet. Register your first product to populate analytics and tracking panels.</p>
                </div>
              ) : (
                <RecentProductsTable products={products} onView={handleViewProduct} onDownloadQr={handleDownloadQr} />
              )}
            </Card>

            <div className="space-y-4">
              <Card>
                <h3 className="mb-3 text-lg font-semibold text-white">Smart Notifications</h3>
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <NotificationCard key={item.id} item={item} />
                  ))}
                </div>
              </Card>
              <Card>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
                  <BookOpenText className="h-5 w-5 text-primary" />
                  Web3 Learning Panel
                </h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>
                    <strong className="text-white">Blockchain verification:</strong> each product record gets a tamper-resistant proof.
                  </li>
                  <li>
                    <strong className="text-white">QR verification:</strong> buyers scan QR codes to validate origin and product data.
                  </li>
                  <li>
                    <strong className="text-white">AI verification:</strong> model checks crop authenticity and quality confidence.
                  </li>
                  <li>
                    <strong className="text-white">Wallet authentication:</strong> your wallet signs actions as a secure digital identity.
                  </li>
                </ul>
              </Card>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-xl font-semibold">Register New Crop</h2>
              <form className="space-y-4" onSubmit={submit}>
                <input value={form.crop_name} onChange={(e) => setForm({ ...form, crop_name: e.target.value })} className="w-full rounded-xl bg-slate-900 p-3" placeholder="Crop name (e.g. Maize)" required />
                <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full rounded-xl bg-slate-900 p-3" placeholder="Quantity (kg)" type="number" min="1" required />
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl bg-slate-900 p-3" placeholder="Product description (quality, batch notes...)" rows={3} />
                <Button className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Activity className="mr-1 inline h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Generate QR Code"
                  )}
                </Button>
              </form>
            </Card>

            <Card>
              <h3 className="mb-4 text-lg font-semibold text-white">Product Quantity Analytics</h3>
              <div className="space-y-3">
                {chartRows.map((row) => (
                  <div key={`${row.name}-${row.value}`}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                      <span>{row.name}</span>
                      <span>{row.value} kg</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round((row.value / maxChartValue) * 100)}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
