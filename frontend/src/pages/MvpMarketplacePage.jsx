import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { CheckCircle2, Filter, MapPin, Search, ShieldCheck, ShoppingCart, Wallet } from "lucide-react";
import {
  isProductVerifiedForMarketplace,
  listProducts,
  recordProductPurchase,
  subscribeToProductChanges,
} from "../services/mvpProducts";
import { listFarmerProfiles, subscribeToFarmerChanges } from "../services/mvpFarmers";
import { getStoredWalletAddress } from "../services/walletSession";
import { sendSolanaPayment } from "../services/solanaProof";
import BrandLogo from "../components/BrandLogo";
import { usePaymentSimulation } from "../context/PaymentSimulationContext";

const PRICE_PER_UNIT_SOL = 0.01;
const LAMPORTS_PER_SOL = 1_000_000_000;
const DEFAULT_BUY_QUANTITY = 1;

function shortenWallet(address) {
  if (!address) return "Not connected";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function parseNumericQuantity(quantityValue) {
  return Number(String(quantityValue || "").replace(/[^\d.]/g, "")) || 1;
}

function getPriceInSol(product) {
  const productPrice = Number(product?.pricePerUnit ?? product?.priceSol);
  if (Number.isFinite(productPrice) && productPrice > 0) return productPrice;
  return Math.max(0.01, parseNumericQuantity(product?.quantity) * PRICE_PER_UNIT_SOL);
}

function getQuantityAvailable(product) {
  const next = Number(product?.quantityAvailable);
  if (Number.isFinite(next)) return Math.max(0, Math.floor(next));
  return Math.max(0, Math.floor(parseNumericQuantity(product?.quantity)));
}

export default function MvpMarketplacePage() {
  const [products, setProducts] = useState([]);
  const [farmerProfiles, setFarmerProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [priceRange, setPriceRange] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [buyerProvince, setBuyerProvince] = useState("");
  const [buyerDistrict, setBuyerDistrict] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(DEFAULT_BUY_QUANTITY);
  const buyerWallet = getStoredWalletAddress();
  const { openCheckout } = usePaymentSimulation();

  useEffect(() => {
    let cancelled = false;
    const load = async ({ silent = false } = {}) => {
      if (!silent) setIsLoading(true);
      try {
        const [productsData, farmersData] = await Promise.all([listProducts(), listFarmerProfiles()]);
        if (!cancelled) {
          setProducts(productsData);
          setFarmerProfiles(farmersData);
        }
      } catch {
        if (!cancelled) toast.error("Could not load marketplace products.");
      } finally {
        if (!cancelled && !silent) setIsLoading(false);
      }
    };

    load({ silent: false });
    const unsubP = subscribeToProductChanges(() => load({ silent: true }));
    const unsubF = subscribeToFarmerChanges(() => load({ silent: true }));
    return () => {
      cancelled = true;
      unsubP();
      unsubF();
    };
  }, []);

  const cropOptions = useMemo(
    () => [...new Set(products.map((item) => item.cropName).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const provinceOptions = useMemo(
    () =>
      [...new Set(products.map((item) => item?.farmerProfile?.province).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [products]
  );

  const districtOptions = useMemo(
    () =>
      [...new Set(products.map((item) => item?.farmerProfile?.district).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = normalize(searchTerm);
    return products.filter((product) => {
      const cropName = product?.cropName || "";
      const farmerName = product?.farmerProfile?.farmerName || "";
      const province = product?.farmerProfile?.province || "";
      const district = product?.farmerProfile?.district || "";
      const isVerified = isProductVerifiedForMarketplace(product);
      const priceInSol = getPriceInSol(product);

      const matchesSearch =
        !q ||
        normalize(cropName).includes(q) ||
        normalize(farmerName).includes(q) ||
        normalize(province).includes(q) ||
        normalize(district).includes(q);
      const matchesCrop = !selectedCrop || cropName === selectedCrop;
      const matchesProvince = !selectedProvince || province === selectedProvince;
      const matchesDistrict = !selectedDistrict || district === selectedDistrict;
      const matchesVerified = !verifiedOnly || isVerified;
      const matchesPrice =
        priceRange === "all" ||
        (priceRange === "low" && priceInSol < 0.5) ||
        (priceRange === "mid" && priceInSol >= 0.5 && priceInSol <= 2) ||
        (priceRange === "high" && priceInSol > 2);

      return matchesSearch && matchesCrop && matchesProvince && matchesDistrict && matchesVerified && matchesPrice;
    });
  }, [products, searchTerm, selectedCrop, selectedProvince, selectedDistrict, verifiedOnly, priceRange]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const aDistrict = normalize(a?.farmerProfile?.district);
      const aProvince = normalize(a?.farmerProfile?.province);
      const bDistrict = normalize(b?.farmerProfile?.district);
      const bProvince = normalize(b?.farmerProfile?.province);
      const targetDistrict = normalize(buyerDistrict);
      const targetProvince = normalize(buyerProvince);

      const aDistrictMatch = targetDistrict && aDistrict === targetDistrict ? 1 : 0;
      const bDistrictMatch = targetDistrict && bDistrict === targetDistrict ? 1 : 0;
      if (aDistrictMatch !== bDistrictMatch) return bDistrictMatch - aDistrictMatch;

      const aProvinceMatch = targetProvince && aProvince === targetProvince ? 1 : 0;
      const bProvinceMatch = targetProvince && bProvince === targetProvince ? 1 : 0;
      if (aProvinceMatch !== bProvinceMatch) return bProvinceMatch - aProvinceMatch;

      return (b.createdAtIso || "").localeCompare(a.createdAtIso || "");
    });
  }, [filteredProducts, buyerDistrict, buyerProvince]);

  const nearbyProducts = useMemo(() => {
    const districtQuery = normalize(buyerDistrict);
    const provinceQuery = normalize(buyerProvince);
    if (!districtQuery && !provinceQuery) return [];
    return sortedProducts.filter((item) => {
      const district = normalize(item?.farmerProfile?.district);
      const province = normalize(item?.farmerProfile?.province);
      return (districtQuery && district === districtQuery) || (provinceQuery && province === provinceQuery);
    });
  }, [sortedProducts, buyerDistrict, buyerProvince]);

  const stats = useMemo(() => {
    const totalVerifiedProducts = products.filter((item) => isProductVerifiedForMarketplace(item)).length;
    const totalFarmers = new Set(farmerProfiles.map((item) => normalize(item?.walletAddress)).filter(Boolean)).size;
    const totalRecords = products.filter(
      (item) =>
        item.blockchainSignature ||
        item.solanaProofPda ||
        Boolean(item.cropHash && (item.farmerWallet || item.walletAddress))
    ).length;
    const totalTransactions = products.reduce((sum, item) => sum + (item.purchases?.length || 0), 0);
    return { totalVerifiedProducts, totalFarmers, totalRecords, totalTransactions };
  }, [products, farmerProfiles]);

  const totalProducts = filteredProducts.length;
  const buyerPurchaseHistory = useMemo(() => {
    if (!buyerWallet) return [];
    return products
      .flatMap((item) =>
        (item.purchases || [])
          .filter((purchase) => normalize(purchase.buyerWallet) === normalize(buyerWallet))
          .map((purchase) => ({
            productId: item.id,
            cropName: item.cropName,
            unitType: item.unitType || purchase.unitType || "units",
            ...purchase,
          }))
      )
      .sort((a, b) => (b.purchasedAtIso || "").localeCompare(a.purchasedAtIso || ""));
  }, [products, buyerWallet]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCrop("");
    setSelectedProvince("");
    setSelectedDistrict("");
    setPriceRange("all");
    setVerifiedOnly(false);
  };

  const openPurchaseModal = (product) => {
    if (getQuantityAvailable(product) <= 0) return;
    setSelectedProduct(product);
    setPurchaseQuantity(DEFAULT_BUY_QUANTITY);
  };

  const closePurchaseModal = () => {
    setSelectedProduct(null);
    setPurchaseQuantity(DEFAULT_BUY_QUANTITY);
  };

  const buyProduct = async (product, quantityMultiplier = 1) => {
    if (!buyerWallet) {
      toast.error("Connect Phantom wallet on landing first.");
      return;
    }
    if (!product?.farmerWallet) {
      toast.error("Farmer wallet is missing for this product.");
      return;
    }

    const safeQuantity = Math.max(1, Number(quantityMultiplier) || 1);
    const available = getQuantityAvailable(product);
    if (safeQuantity > available) {
      toast.error(`Only ${available} ${product.unitType || "units"} available.`);
      return;
    }
    const unitSol = getPriceInSol(product);
    const lamports = Math.max(1, Math.round(unitSol * safeQuantity * LAMPORTS_PER_SOL));
    const totalPaymentSol = unitSol * safeQuantity;
    setPurchaseLoading(product.id);
    try {
      const payment = await sendSolanaPayment({
        buyerWallet,
        farmerWallet: product.farmerWallet,
        lamports,
      });
      if (!payment.signature) {
        toast.error("Payment transaction failed or was cancelled.");
        return;
      }

      await recordProductPurchase(product.id, {
        buyerWallet,
        farmerWallet: product.farmerWallet || product.walletAddress || "",
        quantityPurchased: safeQuantity,
        totalPaymentSol,
        lamports,
        signature: payment.signature,
        explorerUrl: payment.explorerUrl,
        purchasedAtIso: new Date().toISOString(),
      });

      const refreshed = await listProducts();
      setProducts(refreshed);

      toast.success("Purchase proof recorded on Solana.");
      closePurchaseModal();
    } catch {
      toast.error("Could not complete purchase.");
    } finally {
      setPurchaseLoading("");
    }
  };

  /** Opens simulated checkout; on simulated success runs real Solana settlement via buyProduct(). */
  const proceedToPayment = () => {
    const product = selectedProduct;
    if (!product) return;
    if (!buyerWallet) {
      toast.error("Connect Phantom wallet on landing first.");
      return;
    }
    if (!product.farmerWallet) {
      toast.error("Farmer wallet is missing for this product.");
      return;
    }
    const safeQuantity = Math.max(1, Number(purchaseQuantity) || 1);
    const available = getQuantityAvailable(product);
    if (safeQuantity > available) {
      toast.error(`Only ${available} ${product.unitType || "units"} available.`);
      return;
    }
    const amountSol = getPriceInSol(product) * safeQuantity;
    openCheckout({
      product,
      quantity: safeQuantity,
      amountSol,
      onAfterSuccess: async () => {
        await buyProduct(product, safeQuantity);
      },
    });
    closePurchaseModal();
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="glass relative overflow-hidden rounded-3xl border border-emerald-400/20 p-5 sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.2),rgba(15,23,42,0.1)_55%)]" />
          <div className="relative z-10 space-y-4 text-center">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="space-y-2">
                <BrandLogo size="md" showTagline />
                <h1 className="text-2xl font-bold text-white sm:text-3xl">AGRICHAIN Marketplace</h1>
                <p className="mx-auto max-w-2xl text-sm text-slate-300">
                  Discover verified agricultural products directly from trusted farmers.
                </p>
              </div>
              <div className="space-y-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Auto-verified listings + optional Solana proof
                </span>
                <p className="flex items-center justify-center gap-2 text-xs text-slate-300">
                  <Wallet className="h-4 w-4 text-violet-300" />
                  Wallet: {shortenWallet(buyerWallet)}
                </p>
              </div>
            </div>
            {!buyerWallet ? (
              <p className="rounded-xl border border-violet-300/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-200">
                Connect Phantom Wallet to purchase products.
              </p>
            ) : null}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Verified Products</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">{stats.totalVerifiedProducts}</p>
          </article>
          <article className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Farmers</p>
            <p className="mt-2 text-2xl font-bold text-cyan-300">{stats.totalFarmers}</p>
          </article>
          <article className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Blockchain Records</p>
            <p className="mt-2 text-2xl font-bold text-violet-300">{stats.totalRecords}</p>
          </article>
          <article className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Completed Transactions</p>
            <p className="mt-2 text-2xl font-bold text-amber-300">{stats.totalTransactions}</p>
          </article>
        </section>

        {buyerWallet ? (
          <section className="glass rounded-2xl p-4 sm:p-5">
            <h2 className="text-base font-semibold text-white">Your Purchase History</h2>
            <div className="mt-3 space-y-2">
              {buyerPurchaseHistory.slice(0, 5).map((purchase) => (
                <div key={`${purchase.signature}-${purchase.purchasedAtIso}`} className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-xs text-slate-300">
                  <p>
                    {purchase.cropName} ({purchase.productId})
                  </p>
                  <p>
                    Quantity: {purchase.quantityPurchased || 0} {purchase.unitType}
                  </p>
                  <p>Payment: {Number(purchase.totalPaymentSol || 0).toFixed(4)} SOL</p>
                </div>
              ))}
              {!buyerPurchaseHistory.length ? <p className="text-xs text-slate-400">No purchases yet.</p> : null}
            </div>
          </section>
        ) : null}

        <section className="glass rounded-2xl p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Filter className="h-4 w-4 text-emerald-300" />
            Search & Filters
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="xl:col-span-2">
              <span className="mb-1 block text-xs text-slate-400">Search crops, farmer, province or district</span>
              <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="e.g. maize, choma, southern"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>
            </label>
            <label>
              <span className="mb-1 block text-xs text-slate-400">Crop type</span>
              <select
                value={selectedCrop}
                onChange={(event) => setSelectedCrop(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none"
              >
                <option value="">All crops</option>
                {cropOptions.map((crop) => (
                  <option key={crop} value={crop}>
                    {crop}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs text-slate-400">Province</span>
              <select
                value={selectedProvince}
                onChange={(event) => setSelectedProvince(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none"
              >
                <option value="">All provinces</option>
                {provinceOptions.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs text-slate-400">District</span>
              <select
                value={selectedDistrict}
                onChange={(event) => setSelectedDistrict(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none"
              >
                <option value="">All districts</option>
                {districtOptions.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs text-slate-400">Price range</span>
              <select
                value={priceRange}
                onChange={(event) => setPriceRange(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none"
              >
                <option value="all">All prices</option>
                <option value="low">Under 0.5 SOL</option>
                <option value="mid">0.5 - 2 SOL</option>
                <option value="high">Above 2 SOL</option>
              </select>
            </label>
            <label className="flex items-end">
              <span className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100">
                Verified listings only
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(event) => setVerifiedOnly(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
              </span>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-200">
              Buyer province:
              <input
                value={buyerProvince}
                onChange={(event) => setBuyerProvince(event.target.value)}
                placeholder="Set for nearby ranking"
                className="ml-2 w-28 bg-transparent outline-none placeholder:text-slate-500"
              />
            </label>
            <label className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-200">
              Buyer district:
              <input
                value={buyerDistrict}
                onChange={(event) => setBuyerDistrict(event.target.value)}
                placeholder="Set for nearby ranking"
                className="ml-2 w-28 bg-transparent outline-none placeholder:text-slate-500"
              />
            </label>
            <button
              onClick={resetFilters}
              className="rounded-lg border border-emerald-300/40 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/10"
            >
              Browse Again
            </button>
            <Link to="/scan" className="rounded-lg border border-cyan-300/40 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/10">
              QR Verification
            </Link>
          </div>
        </section>

        {nearbyProducts.length > 0 ? (
          <section className="glass rounded-2xl p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-300" />
              <h2 className="text-base font-semibold text-white">Nearby Farmers</h2>
            </div>
            <p className="text-xs text-slate-300">
              Prioritized products from your district/province: {nearbyProducts.length}
            </p>
          </section>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading verified marketplace products...</p>
        ) : totalProducts === 0 ? (
          <section className="glass rounded-3xl p-7 text-center">
            <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-emerald-500/20 p-3 text-emerald-300">
              <Search className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-white">No verified products available yet.</h2>
            <p className="mt-2 text-sm text-slate-300">
              Try changing filters or browse again. Farmers can upload products from the Farmer Dashboard.
            </p>
            <button
              onClick={resetFilters}
              className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400"
            >
              Browse Again
            </button>
          </section>
        ) : (
          <section className="space-y-3">
            <p className="text-sm text-slate-300">{totalProducts} products available</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedProducts.map((product) => {
                const isVerified = isProductVerifiedForMarketplace(product);
                const chainBacked = Boolean(product.blockchainSignature);
                const priceInSol = getPriceInSol(product);
                const quantityAvailable = getQuantityAvailable(product);
                const unitType = product.unitType || "units";
                const soldOut = product.inventoryStatus === "sold_out" || quantityAvailable <= 0;
                const harvestDate = product.harvestDate || product.createdAtIso;
                const description = product.description || `Fresh ${product.cropName} from verified farmers.`;

                return (
                  <article key={product.id} className="glass overflow-hidden rounded-2xl border border-slate-700/80">
                    <div className="h-36 bg-gradient-to-br from-emerald-500/30 via-cyan-500/15 to-slate-900 p-4">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.cropName}
                          className="h-full w-full rounded-xl object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center rounded-xl border border-emerald-300/20 bg-slate-900/40 text-2xl font-bold text-emerald-200">
                          {String(product.cropName || "Crop").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-lg font-semibold text-white">{product.cropName}</h2>
                        <p className="text-sm font-semibold text-amber-300">{priceInSol.toFixed(2)} SOL/{unitType}</p>
                      </div>
                      <p className="text-sm text-slate-300">Quantity remaining: {quantityAvailable} {unitType}</p>
                      <p className="text-xs text-slate-400">{description}</p>
                      <p className="text-xs text-slate-300">Farmer: {product?.farmerProfile?.farmerName || "Unknown farmer"}</p>
                      <p className="text-xs text-slate-400">
                        {product?.farmerProfile?.province || "Province"} / {product?.farmerProfile?.district || "District"}
                      </p>
                      <p className="text-xs text-slate-400">Harvest date: {harvestDate ? new Date(harvestDate).toLocaleDateString() : "Not set"}</p>
                      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-2">
                        <p className="flex items-center gap-1 text-xs font-semibold text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {chainBacked
                            ? "Solana verified"
                            : isVerified
                              ? "System verified"
                              : "Pending verification"}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">Wallet: {shortenWallet(product.farmerWallet || product.walletAddress || "")}</p>
                        <p className="text-[11px] text-slate-400">
                          Timestamp: {product.blockchainTimestamp ? new Date(product.blockchainTimestamp).toLocaleString() : "Not available"}
                        </p>
                      </div>
                      <p className={`text-xs font-semibold ${soldOut ? "text-rose-300" : "text-emerald-300"}`}>
                        {soldOut ? "Sold Out" : "Available"}
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => openPurchaseModal(product)}
                          disabled={purchaseLoading === product.id || soldOut}
                          className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {soldOut ? "Sold Out" : purchaseLoading === product.id ? "Processing..." : "Buy Now"}
                        </button>
                        <Link
                          to={`/scan?productId=${encodeURIComponent(product.id)}`}
                          className="rounded-xl border border-cyan-300/40 px-3 py-2 text-center text-xs font-semibold text-cyan-200 hover:bg-cyan-400/10"
                        >
                          Verify Product
                        </Link>
                      </div>
                      {product.blockchainExplorerUrl ? (
                        <a
                          href={product.blockchainExplorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-xs text-violet-300 hover:text-violet-200"
                        >
                          View Solana Transaction
                        </a>
                      ) : null}
                      {product.purchases?.length ? (
                        <p className="text-xs text-cyan-300">{product.purchases.length} completed purchase proof(s)</p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {selectedProduct ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/75 p-4 sm:items-center sm:justify-center">
          <div className="glass w-full max-w-md rounded-2xl border border-slate-700 p-5">
            <h3 className="text-lg font-semibold text-white">Buy Produce</h3>
            <p className="mt-1 text-sm text-slate-300">{selectedProduct.cropName}</p>
            <p className="mt-1 text-xs text-slate-400">Farmer: {selectedProduct?.farmerProfile?.farmerName || "Unknown farmer"}</p>
            <p className="mt-1 text-xs text-slate-400">Available: {getQuantityAvailable(selectedProduct)} {selectedProduct.unitType || "units"}</p>
            <p className="mt-1 text-xs text-slate-400">Price per unit: {getPriceInSol(selectedProduct).toFixed(2)} SOL</p>
            <label className="mt-4 block text-xs text-slate-400">
              Quantity to buy
              <input
                type="number"
                min={1}
                max={getQuantityAvailable(selectedProduct)}
                value={purchaseQuantity}
                onChange={(event) =>
                  setPurchaseQuantity(
                    Math.min(
                      getQuantityAvailable(selectedProduct),
                      Math.max(1, Number(event.target.value) || 1)
                    )
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <p className="mt-3 text-sm text-amber-300">
              Total Price: {(getPriceInSol(selectedProduct) * purchaseQuantity).toFixed(2)} SOL
            </p>
            <p className="text-xs text-slate-400">Wallet: {shortenWallet(buyerWallet)}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={proceedToPayment}
                disabled={purchaseLoading === selectedProduct.id}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-60"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Proceed to Payment
              </button>
              <button
                onClick={closePurchaseModal}
                className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
