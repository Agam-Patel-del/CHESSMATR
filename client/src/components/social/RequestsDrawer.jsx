import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../app/routes/paths";
import { useNotificationStore } from "../../hooks/useNotification";
import { RequestsIcon, CheckIcon, CrossIcon } from "../common/Icons";
import "./RequestsDrawer.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const formatTime = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const RequestsDrawer = ({ isOpen, onClose }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const addToast = useNotificationStore((s) => s.addToast);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setIsLoading(true);

    const fetchRequests = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/friends/requests`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setPendingRequests(data.pendingRequests || []);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          addToast("Failed to fetch requests", "error");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchRequests();
    return () => {
      controller.abort();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const handleRespond = async (senderId, action) => {
    try {
      const res = await fetch(`${API_BASE}/api/friends/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ senderId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(
          action === "accept"
            ? "Friend request accepted!"
            : "Friend request declined",
          action === "accept" ? "success" : "info"
        );
        setPendingRequests((prev) =>
          prev.filter((r) => r.sender?.id !== senderId)
        );
      } else {
        addToast(data.error || "Failed to respond", "error");
      }
    } catch {
      addToast("Connection error", "error");
    }
  };

  const handleViewProfile = (userId) => {
    onClose();
    navigate(PATHS.PROFILE(userId));
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="requests-drawer-overlay" onClick={onClose} />
      <div className="requests-drawer">
        {/* Header */}
        <div className="requests-drawer-header">
          <div className="requests-drawer-title-group">
            <h2 className="requests-drawer-title">Friend Requests</h2>
            {pendingRequests.length > 0 && (
              <span className="requests-count-badge">
                {pendingRequests.length}
              </span>
            )}
          </div>
          <button className="requests-drawer-close" onClick={onClose}>
            <CrossIcon size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="requests-drawer-body">
          {isLoading ? (
            <div className="requests-drawer-loading">Loading requests...</div>
          ) : pendingRequests.length === 0 ? (
            <div className="requests-empty-state">
              <div className="requests-empty-icon">
                <RequestsIcon size={24} />
              </div>
              <div className="requests-empty-text">
                No pending friend requests
              </div>
              <div className="requests-empty-subtext">
                When players send you a friend request, they will appear here.
              </div>
            </div>
          ) : (
            pendingRequests.map((req) => (
              <div key={req.sender?.id} className="request-item-row">
                <div className="request-item-avatar">
                  {req.sender?.username?.[0]?.toUpperCase() || "?"}
                </div>

                <div className="request-item-info">
                  <div
                    className="request-item-username"
                    onClick={() => handleViewProfile(req.sender?.id)}
                  >
                    {req.sender?.username}
                  </div>
                  <div className="request-item-time">
                    Received {formatTime(req.createdAt)}
                  </div>
                </div>

                <div className="request-item-actions">
                  <button
                    className="request-action-btn accept"
                    onClick={() => handleRespond(req.sender?.id, "accept")}
                    title="Accept request"
                  >
                    <CheckIcon size={14} /> Accept
                  </button>
                  <button
                    className="request-action-btn decline"
                    onClick={() => handleRespond(req.sender?.id, "decline")}
                    title="Decline request"
                  >
                    <CrossIcon size={14} /> Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
