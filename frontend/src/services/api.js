import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("agrichain_wallet_token");
  if (token) {
    config.headers.Authorization = `Wallet ${token}`;
  }
  return config;
});

export const walletService = {
  nonce: (payload) => API.post("/wallet/nonce/", payload),
  verify: (payload) => API.post("/wallet/verify/", payload),
  me: () => API.get("/wallet/me/"),
  disconnect: () => API.post("/wallet/disconnect/"),
  setRole: (payload) => API.post("/wallet/role/", payload),
  getFarmerVerification: () => API.get("/wallet/farmer-verification/"),
  submitFarmerVerification: (payload, onUploadProgress) =>
    API.post("/wallet/farmer-verification/", payload, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    }),
};

export const productService = {
  create: (payload) => API.post("/products/", payload),
  list: () => API.get("/products/"),
  detail: (productId) => API.get(`/products/${productId}/`),
  remove: (productId) => API.delete(`/products/${productId}/delete/`),
};

export default API;
