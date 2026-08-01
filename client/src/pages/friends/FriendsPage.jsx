import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../app/routes/paths";
import { usePresence } from "../../hooks/usePresence";
import { useNotificationStore } from "../../hooks/useNotification";
import { LightningIcon } from "../../components/common/Icons";
import "./FriendsPage.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const FriendsPage = () => {
  const [friends, setFriends] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const friendsStatus = usePresence();
  const addToast = useNotificationStore((s) => s.addToast);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    const fetchFriends = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/friends?page=${page}&limit=20`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setFriends(data.friends || []);
          setTotalPages(data.totalPages || 1);
        } else {
          addToast("Failed to fetch friends list", "error");
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          addToast("Connection error", "error");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchFriends();
    return () => {
      controller.abort();
    };
  }, [page, addToast]);

  const getStatus = (friendId) => friendsStatus[friendId] || "offline";

  const handleChallenge = (friend) => {
    const status = getStatus(friend.id);
    if (status !== "online") {
      addToast("Only online friends can be challenged!", "warning");
      return;
    }
    navigate(
      `${PATHS.LOBBY}?challengeUser=${friend.id}&username=${encodeURIComponent(friend.username)}`
    );
  };

  const sortedFriends = [...friends].sort((a, b) => {
    const order = { online: 0, in_game: 1, offline: 2 };
    return (order[getStatus(a.id)] ?? 2) - (order[getStatus(b.id)] ?? 2);
  });

  if (isLoading) {
    return (
      <div className="friends-page-container">
        <div className="friends-loading-container">Loading friends list...</div>
      </div>
    );
  }

  return (
    <div className="friends-page-container">
      {/* Row-Based Friends List */}
      <div className="friends-list-card">
        {sortedFriends.length === 0 ? (
          <div className="friends-empty-state">
            <div className="friends-empty-title">No friends added yet</div>
            <div className="friends-empty-subtitle">
              Search for players and send friend requests to start playing together!
            </div>
          </div>
        ) : (
          sortedFriends.map((friend) => {
            const status = getStatus(friend.id);
            const isOnline = status === "online";

            return (
              <div
                key={friend.id}
                className="friend-list-row"
                onClick={() => navigate(PATHS.PROFILE(friend.id))}
              >
                {/* Left: Avatar & Username */}
                <div className="friend-row-left">
                  <div className="friend-row-avatar-wrapper">
                    <div className="friend-row-avatar">
                      {friend.username[0].toUpperCase()}
                    </div>
                    <div className={`friend-row-status-dot ${status}`} />
                  </div>

                  <div className="friend-row-info">
                    <div className="friend-row-username">
                      {friend.username}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="friend-row-actions">
                  <button
                    className="friend-row-challenge-btn"
                    disabled={!isOnline}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChallenge(friend);
                    }}
                    title={
                      isOnline
                        ? "Challenge friend to a live match"
                        : "Player must be online to challenge"
                    }
                  >
                    <LightningIcon size={13} />
                    Challenge
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="friends-pagination">
          <button
            className="friends-page-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="friends-page-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="friends-page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
