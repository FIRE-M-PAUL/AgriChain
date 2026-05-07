import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import AnalyticsPage from "../pages/AnalyticsPage";
import DashboardPage from "../pages/DashboardPage";
import BuyerDashboardPage from "../pages/BuyerDashboardPage";
import BuyerScanProductPage from "../pages/BuyerScanProductPage";
import BuyerVerificationPage from "../pages/BuyerVerificationPage";
import BuyerTrustedFarmersPage from "../pages/BuyerTrustedFarmersPage";
import BuyerHistoryPage from "../pages/BuyerHistoryPage";
import BuyerAnalyticsPage from "../pages/BuyerAnalyticsPage";
import GenerateQrPage from "../pages/GenerateQrPage";
import ProductDetailsPage from "../pages/ProductDetailsPage";
import ProductHistoryPage from "../pages/ProductHistoryPage";
import RegisterCropPage from "../pages/RegisterCropPage";
import RoleOnboardingPage from "../pages/RoleOnboardingPage";
import ScanProductPage from "../pages/ScanProductPage";
import ScannerRedirectPage from "../pages/ScannerRedirectPage";
import UploadCropImagePage from "../pages/UploadCropImagePage";
import NotFoundPage from "../pages/NotFoundPage";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="farmer">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/buyer/dashboard"
        element={
          <ProtectedRoute requiredRole="buyer">
            <BuyerDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/buyer" element={<Navigate to="/buyer/dashboard" replace />} />
      <Route
        path="/buyer/scan-product"
        element={
          <ProtectedRoute requiredRole="buyer">
            <BuyerScanProductPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/buyer/verification-center"
        element={
          <ProtectedRoute requiredRole="buyer">
            <BuyerScanProductPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/buyer/verification/:productId"
        element={
          <ProtectedRoute requiredRole="buyer">
            <BuyerVerificationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/buyer/trusted-farmers"
        element={
          <ProtectedRoute requiredRole="buyer">
            <BuyerTrustedFarmersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/buyer/history"
        element={
          <ProtectedRoute requiredRole="buyer">
            <BuyerHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/buyer/analytics"
        element={
          <ProtectedRoute requiredRole="buyer">
            <BuyerAnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <RoleOnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route path="/products/:productId" element={<ProductDetailsPage />} />
      <Route
        path="/register-crop"
        element={
          <ProtectedRoute requiredRole="farmer">
            <RegisterCropPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/generate-qr"
        element={
          <ProtectedRoute requiredRole="farmer">
            <GenerateQrPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload-crop-image"
        element={
          <ProtectedRoute requiredRole="farmer">
            <UploadCropImagePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/product-history"
        element={
          <ProtectedRoute requiredRole="farmer">
            <ProductHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scan-product"
        element={
          <ProtectedRoute requiredRole="farmer">
            <ScanProductPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute requiredRole="farmer">
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/scanner" element={<ScannerRedirectPage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
