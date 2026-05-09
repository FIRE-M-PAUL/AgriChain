import { Navigate, Route, Routes } from "react-router-dom";
import MvpLandingPage from "../pages/MvpLandingPage";
import MvpFarmerPage from "../pages/MvpFarmerPage";
import MvpScanPage from "../pages/MvpScanPage";
import MvpRoleSelectionPage from "../pages/MvpRoleSelectionPage";
import MvpMarketplacePage from "../pages/MvpMarketplacePage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MvpLandingPage />} />
      <Route path="/role" element={<MvpRoleSelectionPage />} />
      <Route path="/farmer" element={<MvpFarmerPage />} />
      <Route path="/marketplace" element={<MvpMarketplacePage />} />
      <Route path="/scan" element={<MvpScanPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
