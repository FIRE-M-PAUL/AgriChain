import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ScannerRedirectPage() {
  const { role } = useAuth();
  if (role === "buyer") return <Navigate to="/buyer/scan-product" replace />;
  return <Navigate to="/scan-product" replace />;
}
