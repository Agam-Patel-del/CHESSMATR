import React, { useState } from "react";
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { PATHS } from "../routes/paths";
import { useAuth } from "../../providers/AuthProvider";
import { UserSearchModal } from "../../components/social/UserSearchModal";
import { RequestsDrawer } from "../../components/social/RequestsDrawer";
import { SearchIcon, RequestsIcon } from "../../components/common/Icons";
import "./AppLayout.css";

export const AppLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate(PATHS.LOGIN);
  };

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <Link to={PATHS.HOME} className="app-brand">
          ChessMatr
        </Link>
        <nav className="app-nav">
          <NavLink
            to={PATHS.LOBBY}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Lobby
          </NavLink>
          <NavLink
            to={PATHS.FRIENDS}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Friends
          </NavLink>
          <NavLink
            to={PATHS.HISTORY}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            History
          </NavLink>
          {user && (
            <NavLink
              to={PATHS.PROFILE(user.id)}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              Profile
            </NavLink>
          )}
          <NavLink
            to={PATHS.SETTINGS}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Settings
          </NavLink>
        </nav>
      </aside>

      <div className="app-content-wrapper">
        <header className="app-topbar">
          <div className="topbar-left"></div>
          <div className="topbar-right">
            <button
              className="topbar-icon-btn"
              onClick={() => setIsSearchOpen(true)}
              title="Search Players"
            >
              <SearchIcon size={18} />
            </button>

            <button
              className="topbar-icon-btn"
              onClick={() => setIsRequestsOpen(true)}
              title="Friend Requests"
            >
              <RequestsIcon size={19} />
            </button>

            <span className="user-menu">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="user-menu"
              style={{
                background: "none",
                border: "none",
                font: "inherit",
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          </div>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>

      {/* Modals & Drawers */}
      <UserSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      <RequestsDrawer
        isOpen={isRequestsOpen}
        onClose={() => setIsRequestsOpen(false)}
      />
    </div>
  );
};
