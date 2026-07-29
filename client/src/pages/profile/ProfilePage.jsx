import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import { useNotificationStore } from "../../hooks/useNotification";
import { GameHistoryList } from "../history/GameHistoryList";
import {
  CheckIcon,
  CrossIcon,
  PlusIcon,
  UserMinusIcon,
} from "../../components/common/Icons";
import "./ProfilePage.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const ProfilePage = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const addToast = useNotificationStore((s) => s.addToast);
  const showConfirmation = useNotificationStore((s) => s.showConfirmation);

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    setIsLoading(true);

    const fetchProfile = async () => {
      try {
        const profileRes = await fetch(
          `${API_BASE}/api/users/${userId}/profile`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data.user);
        } else {
          addToast("Failed to load player profile", "error");
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error fetching profile:", err);
          addToast("Connection error. Could not fetch profile.", "error");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      controller.abort();
    };
  }, [userId]);

  const handleSendRequest = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/friends/request/${userId}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Friend request sent!", "success");
        setProfile((prev) => ({ ...prev, hasSentRequest: true }));
      } else {
        addToast(data.error || "Failed to send request", "error");
      }
    } catch {
      addToast("Connection error", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespond = async (action) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/friends/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ senderId: userId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(
          action === "accept"
            ? "Friend request accepted!"
            : "Friend request declined",
          action === "accept" ? "success" : "info",
        );
        setProfile((prev) => ({
          ...prev,
          isFriend: action === "accept",
          hasReceivedRequest: false,
          hasSentRequest: false,
        }));
      } else {
        addToast(data.error || "Failed to respond", "error");
      }
    } catch {
      addToast("Connection error", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = () => {
    showConfirmation({
      title: "Remove Friend",
      message: `Are you sure you want to remove ${profile.username} from your friends list?`,
      confirmText: "Unfriend",
      type: "danger",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await fetch(`${API_BASE}/api/friends/${userId}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (res.ok) {
            addToast(`Removed ${profile.username} from friends`, "info");
            setProfile((prev) => ({ ...prev, isFriend: false }));
          } else {
            const data = await res.json();
            addToast(data.error || "Failed to remove friend", "error");
          }
        } catch {
          addToast("Connection error", "error");
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const renderProfileActions = () => {
    if (isOwnProfile || !profile) return null;

    if (profile.isFriend) {
      return (
        <div className="profile-actions">
          <span className="profile-action-btn friends-badge">
            <CheckIcon size={14} /> Friends
          </span>
          <button
            className="profile-action-btn unfriend-btn"
            onClick={handleUnfriend}
            disabled={actionLoading}
          >
            <UserMinusIcon size={14} /> Unfriend
          </button>
        </div>
      );
    }

    if (profile.hasSentRequest) {
      return (
        <div className="profile-actions">
          <span className="profile-action-btn request-sent">Request Sent</span>
        </div>
      );
    }

    if (profile.hasReceivedRequest) {
      return (
        <div className="profile-actions">
          <button
            className="profile-action-btn accept-btn"
            onClick={() => handleRespond("accept")}
            disabled={actionLoading}
          >
            <CheckIcon size={14} /> Accept
          </button>
          <button
            className="profile-action-btn decline-btn"
            onClick={() => handleRespond("decline")}
            disabled={actionLoading}
          >
            <CrossIcon size={14} /> Decline
          </button>
        </div>
      );
    }

    return (
      <div className="profile-actions">
        <button
          className="profile-action-btn add-friend-btn"
          onClick={handleSendRequest}
          disabled={actionLoading}
        >
          <PlusIcon size={14} /> Add Friend
        </button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="profile-container">
        <div className="profile-loading">Loading player profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-container">
        <div className="profile-error">Player not found or failed to load.</div>
      </div>
    );
  }

  const {
    wins = 0,
    losses = 0,
    draws = 0,
    gamesPlayed = 0,
  } = profile.stats || {};

  const winRate =
    gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) : "0.0";

  const joinedDate = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="profile-container">
      {/* Profile Card Header */}
      <div className="profile-header-card">
        <div className="profile-avatar-large">
          {profile.username[0].toUpperCase()}
        </div>
        <div className="profile-identity">
          <h2>{profile.username}</h2>
          <span className="joined-date">Member since {joinedDate}</span>
        </div>
        {renderProfileActions()}
      </div>

      {/* Statistics Cards Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Win Rate</div>
          <div className="stat-value text-success">{winRate}%</div>
          <div className="stat-subtitle">Based on {gamesPlayed} games</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Wins</div>
          <div className="stat-value">{wins}</div>
          <div className="stat-subtitle">Matches won</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Losses</div>
          <div className="stat-value">{losses}</div>
          <div className="stat-subtitle">Matches lost</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Draws</div>
          <div className="stat-value">{draws}</div>
          <div className="stat-subtitle">Matches drawn</div>
        </div>
      </div>

      {/* Match History Section */}
      <div style={{ marginTop: "24px" }}>
        <GameHistoryList
          userId={userId}
          title="Recent Matches"
          subtitle="Displaying played games and match analysis."
          headerTag="h3"
        />
      </div>
    </div>
  );
};
