import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AdminDashboardSkeleton } from "@/components/skeletons/AdminSkeleton";

export function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, userDoc, loading } = useAuth();

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  if (!user || !userDoc) {
    return <Navigate to="/auth" replace />;
  }

  if (userDoc.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
