import "./nodePolyfills.js";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { PaymentSimulationProvider } from "./context/PaymentSimulationContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <PaymentSimulationProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Toaster position="top-right" />
        <App />
      </BrowserRouter>
      </PaymentSimulationProvider>
    </AuthProvider>
  </React.StrictMode>
);
