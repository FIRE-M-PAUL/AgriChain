import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setStoredRole } from "../services/walletSession";

const AuthContext = createContext(null);
const WALLET_ADDRESS_KEY = "agrichain_wallet_address";
const WALLET_TOKEN_KEY = "agrichain_wallet_token";

function getPhantomProvider() {
  if (typeof window === "undefined") {
    return null;
  }
  const provider = window.solana;
  if (!provider || !provider.isPhantom) {
    return null;
  }
  return provider;
}

/** MVP: Phantom-only wallet session (no Django JWT / legacy API). */
export function AuthProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState(localStorage.getItem(WALLET_ADDRESS_KEY));
  /** Kept for backwards compatibility with consumes of `isAuthenticated` / `token` (always clear in MVP). */
  const [token, setToken] = useState(() => {
    const legacy = localStorage.getItem(WALLET_TOKEN_KEY);
    if (legacy) localStorage.removeItem(WALLET_TOKEN_KEY);
    return null;
  });
  const [role] = useState(null);
  const [profile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSettingRole] = useState(false);
  const [walletError, setWalletError] = useState("");

  const connectWallet = async () => {
    if (isConnecting) {
      throw new Error("A wallet connection is already in progress.");
    }
    const provider = getPhantomProvider();
    if (!provider) {
      throw new Error("Phantom wallet not found. Please install Phantom extension.");
    }
    setIsConnecting(true);
    setWalletError("");
    try {
      const resp = await provider.connect();
      const connectedAddress = resp?.publicKey?.toString?.() || provider.publicKey?.toString?.() || "";
      if (!connectedAddress) {
        throw new Error("Connected wallet address was not returned by Phantom.");
      }
      localStorage.setItem(WALLET_ADDRESS_KEY, connectedAddress);
      setWalletAddress(connectedAddress);
      setToken(null);
      setWalletError("");
      return { role: null };
    } catch (error) {
      const message =
        error?.code === 4001 || String(error?.message || "").toLowerCase().includes("rejected")
          ? "Wallet connection was rejected."
          : error.message || "Wallet connection failed.";
      setWalletError(message);
      throw new Error(message);
    } finally {
      setIsConnecting(false);
    }
  };

  /** Phantom disconnect + wipe local JWT/MVP hints; no REST calls. */
  const disconnectWallet = async () => {
    try {
      const phantomProvider = getPhantomProvider();
      if (phantomProvider?.disconnect) await phantomProvider.disconnect();
    } catch {
      /* already disconnected */
    }
    localStorage.removeItem(WALLET_TOKEN_KEY);
    localStorage.removeItem(WALLET_ADDRESS_KEY);
    setStoredRole("");
    setToken(null);
    setWalletAddress(null);
    setWalletError("");
  };

  const selectRole = async () => {
    throw new Error("Role selection runs on /role MVP page (no Django backend).");
  };

  const submitFarmerVerification = async () => {
    throw new Error("Use Farmer dashboard MVP (Supabase + Phantom). Legacy verification disabled.");
  };

  useEffect(() => {
    setLoadingProfile(false);
  }, []);

  useEffect(() => {
    const provider = getPhantomProvider();
    if (!provider || walletAddress || isConnecting) {
      return;
    }

    let isMounted = true;
    const autoReconnect = async () => {
      const stored = localStorage.getItem(WALLET_ADDRESS_KEY);
      if (!stored) return;
      try {
        const resp = await provider.connect({ onlyIfTrusted: true });
        const trustedAddress = resp?.publicKey?.toString?.() || provider.publicKey?.toString?.();
        if (trustedAddress && isMounted) setWalletAddress(trustedAddress);
      } catch {
        /* user must reconnect */
      }
    };

    autoReconnect();
    return () => {
      isMounted = false;
    };
  }, [walletAddress, isConnecting]);

  const value = useMemo(
    () => ({
      token,
      walletAddress,
      role,
      profile,
      needsRoleSelection: false,
      isAuthenticated: Boolean(walletAddress),
      loadingProfile,
      isConnecting,
      isSettingRole,
      walletError,
      connectWallet,
      disconnectWallet,
      selectRole,
      submitFarmerVerification,
    }),
    [
      token,
      walletAddress,
      role,
      profile,
      loadingProfile,
      isConnecting,
      isSettingRole,
      walletError,
    ]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
