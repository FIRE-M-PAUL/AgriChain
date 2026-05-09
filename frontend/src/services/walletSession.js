const WALLET_KEY = "agrichain_wallet_address";
const ROLE_KEY = "agrichain_user_role";

export function getStoredWalletAddress() {
  return localStorage.getItem(WALLET_KEY) || "";
}

export function setStoredWalletAddress(address) {
  if (!address) {
    localStorage.removeItem(WALLET_KEY);
    return;
  }
  localStorage.setItem(WALLET_KEY, address);
}

export function getStoredRole() {
  return localStorage.getItem(ROLE_KEY) || "";
}

export function setStoredRole(role) {
  if (!role) {
    localStorage.removeItem(ROLE_KEY);
    return;
  }
  localStorage.setItem(ROLE_KEY, role);
}
