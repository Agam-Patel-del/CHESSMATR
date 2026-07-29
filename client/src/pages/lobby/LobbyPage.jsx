import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PATHS } from "../../app/routes/paths";
import { useQueueSocket } from "../../hooks/useQueueSocket";
import { useQueueStore } from "./stores/queueStore";
import { useAuth } from "../../providers/AuthProvider";
import { useNotificationStore } from "../../hooks/useNotification";
import { socket } from "../../config/socket";
import "./LobbyPage.css";

const TIME_CONTROLS = [
  { base: 1, increment: 0, category: "Bullet", label: "1+0" },
  { base: 1, increment: 1, category: "Bullet", label: "1+1" },
  { base: 2, increment: 1, category: "Bullet", label: "2+1" },
  { base: 3, increment: 0, category: "Blitz", label: "3+0" },
  { base: 3, increment: 2, category: "Blitz", label: "3+2" },
  { base: 5, increment: 0, category: "Blitz", label: "5+0" },
  { base: 5, increment: 3, category: "Blitz", label: "5+3" },
  { base: 10, increment: 0, category: "Rapid", label: "10+0" },
  { base: 10, increment: 5, category: "Rapid", label: "10+5" },
  { base: 15, increment: 10, category: "Rapid", label: "15+10" },
  { base: 30, increment: 0, category: "Rapid", label: "30+0" },
];

const CATEGORIES = ["Bullet", "Blitz", "Rapid"];

export const LobbyPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const challengeUserId = searchParams.get("challengeUser");
  const challengeUsername = searchParams.get("username");

  const { joinQueue, leaveQueue } = useQueueSocket();
  const activeQueues = useQueueStore((s) => s.activeQueues);
  const { user } = useAuth();
  const addToast = useNotificationStore((s) => s.addToast);
  const [elapsed, setElapsed] = useState(0);

  const queueCount = Object.keys(activeQueues).length;
  const isSearching = queueCount > 0;

  useEffect(() => {
    if (!isSearching) {
      setElapsed(0);
      return;
    }
    const times = Object.values(activeQueues).map((q) => q.searchStartedAt);
    const earliest = Math.min(...times);
    const iv = setInterval(
      () => setElapsed(Math.floor((Date.now() - earliest) / 1000)),
      1000,
    );
    return () => clearInterval(iv);
  }, [isSearching, queueCount]);

  const getQueueKey = (tc) => `queue_${tc.base}_${tc.increment}`;
  const handleCardClick = (tc) => {
    if (challengeUserId) {
      socket.emit("challenge:send", {
        toUserId: challengeUserId,
        timeControl: { base: tc.base, increment: tc.increment },
      });
      addToast(
        `Challenge (${tc.label}) sent to ${challengeUsername || "friend"}!`,
        "info",
      );
      setSearchParams({});
      return;
    }

    const queueKey = getQueueKey(tc);
    if (queueKey in activeQueues) {
      leaveQueue(queueKey);
    } else {
      joinQueue({ base: tc.base, increment: tc.increment });
    }
  };

  return (
    <div className="lobby-container">
      {/* ---- Challenge Banner (Same UI as Search Banner) ---- */}
      {challengeUserId && (
        <div className="search-banner">
          <div className="search-banner-left">
            <div className="search-banner-info">
              <span className="search-banner-text">
                Challenging {challengeUsername || "Friend"}
              </span>
              <span className="search-banner-queues">
                <span className="search-banner-queue-tag">
                  Select any time control card below to send challenge
                </span>
              </span>
            </div>
          </div>
          <div className="search-banner-right">
            <button
              className="search-cancel-all-btn"
              onClick={() => setSearchParams({})}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ---- Search banner ---- */}
      {isSearching && (
        <div className="search-banner">
          <div className="search-banner-left">
            <div className="search-banner-spinner"></div>
            <div className="search-banner-info">
              <span className="search-banner-text">
                Searching {queueCount} {queueCount === 1 ? "queue" : "queues"}
              </span>
              <span className="search-banner-queues">
                {Object.entries(activeQueues).map(([key, q]) => (
                  <span key={key} className="search-banner-queue-tag">
                    {q.timeControl.base}+{q.timeControl.increment}
                  </span>
                ))}
              </span>
            </div>
          </div>
          <div className="search-banner-right">
            <span className="search-banner-elapsed">{`${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`}</span>
            <button
              className="search-cancel-all-btn"
              onClick={() => leaveQueue()}
            >
              Cancel All
            </button>
          </div>
        </div>
      )}

      {/* ---- Header ---- */}
      <header className="lobby-welcome-banner">
        <div className="lobby-welcome-text">
          <h2>Welcome, {user?.username}</h2>
        </div>
      </header>

      {/* ---- Time controls by category ---- */}
      {CATEGORIES.map((category) => (
        <section className="lobby-section" key={category}>
          <div className="section-header">
            <h3 className="lobby-section-title">{category}</h3>
          </div>
          <div className="quick-play-grid">
            {TIME_CONTROLS.filter((tc) => tc.category === category).map(
              (tc) => {
                const queueKey = getQueueKey(tc);
                const isQueued = queueKey in activeQueues;

                return (
                  <button
                    className={`quick-play-card${isQueued ? " queued" : ""}`}
                    key={tc.label}
                    onClick={() => handleCardClick(tc)}
                  >
                    <div className="card-top">
                      <span className="quick-play-time">{tc.label}</span>
                      {isQueued && (
                        <span className="quick-play-badge searching">
                          Searching...
                        </span>
                      )}
                    </div>
                    <h4 className="quick-play-name">{tc.category}</h4>
                    {isQueued && (
                      <p className="queue-cancel-hint">Click to cancel</p>
                    )}
                  </button>
                );
              },
            )}
          </div>
        </section>
      ))}
    </div>
  );
};
