import React from "react";
import { Outlet } from "react-router-dom";
import "./PublicLayout.css";

export const PublicLayout = () => {
  return (
    <div className="public-layout">
      <main className="public-main">
        <Outlet />
      </main>
    </div>
  );
};
