import React from "react";
import { Outlet, Link } from "react-router-dom";
import { PATHS } from "../routes/paths";
import "./AuthLayout.css";

export const AuthLayout = () => {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-header">
          <Link to={PATHS.HOME} className="auth-logo">
            ChessMatr
          </Link>
        </div>
        <div className="auth-card">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
