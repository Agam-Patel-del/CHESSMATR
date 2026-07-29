import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../../providers/AuthProvider";
import { PATHS } from "../paths";

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={PATHS.LOGIN} replace />;
  }

  return <Outlet />;
};
