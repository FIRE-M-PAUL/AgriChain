import { createContext, useContext, useEffect, useMemo, useState } from "react";
import bs58 from "bs58";
import { walletService } from "../services/api";

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

function parseWalletError(error) {
  // Keep user-facing errors actionable while preserving raw debugging details.
  if (!error) {
    return "Wallet connection failed. Please try again.";
  }

  const message = String(error.message || "").toLowerCase();
  const code = error.code;

  if (code === 4001 || message.includes("user rejected")) {
    return "Wallet connection was rejected.";
  }
  if (message.includes("locked")) {
    return "Phantom is locked. Unlock your wallet and try again.";
  }
  if (message.includes("onlyiftrusted")) {
    return "Trusted reconnect was not available. Please connect manually.";
  }
  if (message.includes("network") || message.includes("failed to fetch")) {
    return "Network error while connecting wallet. Check your connection.";
  }
  if (message.includes("signmessage") || message.includes("signature")) {
    return "Signature was not completed. Please approve the sign request in Phantom.";
  }
  if (message.includes("already processing") || message.includes("already pending")) {
    return "A wallet request is already in progress. Please wait.";
  }

  return error.message || "Wallet connection failed. Please try again.";
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem(WALLET_TOKEN_KEY));
  const [walletAddress, setWalletAddress] = useState(localStorage.getItem(WALLET_ADDRESS_KEY));
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSettingRole, setIsSettingRole] = useState(false);
  const [walletError, setWalletError] = useState("");

  const connectWallet = async () => {
    if (isConnecting) {
      throw new Error("A wallet connection is already in progress.");
    }

    const provider = getPhantomProvider();
    const hasWindow = typeof window !== "undefined";
    const solana = hasWindow ? window.solana : null;
    console.debug("[AGRICHAIN] Phantom provider detection:", {
      hasWindow,
      hasSolana: !!solana,
      isPhantom: !!solana?.isPhantom,
    });

    if (!provider) {
      throw new Error("Phantom wallet not found. Please install Phantom extension.");
    }

    setIsConnecting(true);
    setWalletError("");
    try {
      console.debug("[AGRICHAIN] Initiating Phantom connect request...");
      const resp = await provider.connect();
      const connectedAddress = resp?.publicKey?.toString?.() || provider.publicKey?.toString?.();
      if (!connectedAddress) {
        throw new Error("Connected wallet address was not returned by Phantom.");
      }
      console.debug("[AGRICHAIN] Phantom connected:", connectedAddress);

      const nonceRes = await walletService.nonce({ wallet_address: connectedAddress });
      const encodedMessage = new TextEncoder().encode(nonceRes.data.message);
      const signed = await provider.signMessage(encodedMessage, "utf8");
      const signature = bs58.encode(signed.signature);

      const verifyRes = await walletService.verify({
        wallet_address: connectedAddress,
        nonce: nonceRes.data.nonce,
        signature,
      });

      localStorage.setItem(WALLET_TOKEN_KEY, verifyRes.data.token);
      localStorage.setItem(WALLET_ADDRESS_KEY, connectedAddress);
      setToken(verifyRes.data.token);
      setWalletAddress(connectedAddress);
      setRole(verifyRes.data.role || null);
      setWalletError("");
      console.debug("[AGRICHAIN] Wallet login successful.");
      return {
        role: verifyRes.data.role || null,
      };
    } catch (error) {
      console.error("Wallet connection failed:", error);
      const message = parseWalletError(error);
      setWalletError(message);
      throw new Error(message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await walletService.disconnect();
      const provider = getPhantomProvider();
      if (provider) {
        await provider.disconnect();
      }
    } catch {
      // Ignore disconnect cleanup errors
    }
    localStorage.removeItem(WALLET_TOKEN_KEY);
    localStorage.removeItem(WALLET_ADDRESS_KEY);
    setToken(null);
    setWalletAddress(null);
    setRole(null);
    setProfile(null);
    setWalletError("");
  };

  const selectRole = async (nextRole) => {
    if (!token) {
      throw new Error("Connect wallet before selecting a role.");
    }
    setIsSettingRole(true);
    try {
      const res = await walletService.setRole({ role: nextRole });
      setRole(res.data.role);
      setProfile(res.data);
    } catch (error) {
      const message = error?.response?.data?.detail || error.message || "Could not save wallet role";
      throw new Error(message);
    } finally {
      setIsSettingRole(false);
    }
  };

  const submitFarmerVerification = async (payload) => {
    const res = await walletService.submitFarmerVerification(payload);
    setProfile(res.data.profile);
    setRole(res.data.profile.role);
    return res.data;
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setLoadingProfile(false);
        return;
      }
      try {
        const res = await walletService.me();
        setWalletAddress(res.data.wallet_address);
        setRole(res.data.role || null);
        setProfile(res.data);
      } catch {
        disconnectWallet();
      } finally {
        setLoadingProfile(false);
      }
    };
    loadProfile();
  }, [token]);

  useEffect(() => {
    const provider = getPhantomProvider();
    if (!provider || token || isConnecting) {
      return;
    }

    let isMounted = true;
    const autoReconnect = async () => {
      const hadWalletBefore = !!localStorage.getItem(WALLET_ADDRESS_KEY);
      if (!hadWalletBefore) {
        return;
      }

      try {
        console.debug("[AGRICHAIN] Attempting trusted Phantom reconnect...");
        const resp = await provider.connect({ onlyIfTrusted: true });
        const trustedAddress = resp?.publicKey?.toString?.() || provider.publicKey?.toString?.();
        if (trustedAddress && isMounted) {
          setWalletAddress(trustedAddress);
          console.debug("[AGRICHAIN] Trusted reconnect success:", trustedAddress);
        }
      } catch (error) {
        console.error("Trusted reconnect failed:", error);
      }
    };

    autoReconnect();
    return () => {
      isMounted = false;
    };
  }, [token, isConnecting]);

  const value = useMemo(
    () => ({
      token,
      walletAddress,
      role,
      profile,
      needsRoleSelection: !!token && !role,
      isAuthenticated: !!token,
      loadingProfile,
      isConnecting,
      isSettingRole,
      walletError,
      connectWallet,
      disconnectWallet,
      selectRole,
      submitFarmerVerification,
    }),
    [token, walletAddress, role, profile, loadingProfile, isConnecting, isSettingRole, walletError]
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
