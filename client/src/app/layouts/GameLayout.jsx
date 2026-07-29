import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { PATHS } from "../routes/paths";
import "./GameLayout.css";

export const GameLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="game-layout">
      <main className="game-main">
        <Outlet />
      </main>
    </div>
  );
};
