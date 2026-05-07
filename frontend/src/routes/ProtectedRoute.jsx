import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, loadingProfile, needsRoleSelection, role } = useAuth();
  if (loadingProfile) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  // Allow onboarding route to render when the wallet has no role yet.
  if (needsRoleSelection && requiredRole) return <Navigate to="/onboarding" replace />;
  if (requiredRole && role !== requiredRole) {
    if (role === "buyer") return <Navigate to="/buyer/dashboard" replace />;
    if (role === "farmer") return <Navigate to="/dashboard" replace />;
  }
  return children;
}
