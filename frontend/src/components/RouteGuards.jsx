import { Navigate, useLocation } from "react-router-dom";

import AppLoader from "@/components/AppLoader";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPath } from "@/lib/auth";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const { currentUser, isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <AppLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={getDashboardPath(currentUser.role)} replace />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { currentUser, isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <AppLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(currentUser.role)} replace />;
  }

  return children;
};

export { ProtectedRoute, PublicOnlyRoute };
