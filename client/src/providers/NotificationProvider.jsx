import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNotificationStore } from "../hooks/useNotification";
import { socket } from "../config/socket";
import { PATHS } from "../app/routes/paths";
import { soundService } from "../services/soundService";
import { useGameStore } from "../hooks/useChess";
import "./NotificationProvider.css";

export const NotificationProvider = ({ children }) => {
  const toasts = useNotificationStore((s) => s.toasts);
  const removeToast = useNotificationStore((s) => s.removeToast);
  const confirmation = useNotificationStore((s) => s.confirmation);
  const addToast = useNotificationStore((s) => s.addToast);
  const showConfirmation = useNotificationStore((s) => s.showConfirmation);
  const closeConfirmation = useNotificationStore((s) => s.closeConfirmation);

  const [challengeData, setChallengeData] = useState(null);
  const countdownIntervalRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  const clearChallengeTimer = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  useEffect(() => {
    const handleRematchRequested = ({ requester, gameId }) => {
      const onGamePage = location.pathname.includes("/app/game/live/");
      const gameContextMsg = onGamePage
        ? "Your opponent wants a rematch!"
        : "Your opponent from the last game is challenging you to a rematch!";

      showConfirmation({
        title: "Rematch Challenge",
        message: gameContextMsg,
        confirmText: "Accept",
        cancelText: "Decline",
        type: "rematch",
        onConfirm: () => {
          socket.emit("game:rematch_accept", { gameId });
          if (!onGamePage) {
            navigate(PATHS.GAME(gameId));
          }
        },
        onCancel: () => {
          socket.emit("game:rematch_decline", { gameId });
        },
      });
    };

    const handleRematchDeclined = () => {
      closeConfirmation();
      addToast("Opponent declined the rematch request", "warning");
    };

    const handleGameRestarted = () => {
      closeConfirmation();
      addToast("Game restarted! Good luck.", "success");
    };

    const handleDrawOffered = ({ offererColor, gameId }) => {
      showConfirmation({
        title: "Draw Offered",
        message: "Your opponent has offered a draw. Do you want to accept it?",
        confirmText: "Accept Draw",
        cancelText: "Decline",
        type: "draw",
        onConfirm: () => {
          socket.emit("game:draw_accept", { gameId });
        },
        onCancel: () => {
          socket.emit("game:draw_decline", { gameId });
        },
      });
    };

    const handleDrawDeclined = () => {
      useNotificationStore.setState({ confirmation: null });
      addToast("Draw offer declined by opponent", "warning");
    };

    const handleIncomingChallenge = ({
      challengeId,
      challenger,
      timeControl,
      expiresInSeconds,
    }) => {
      soundService.playChallenge();
      clearChallengeTimer();

      const initialTime = expiresInSeconds || 30;
      setChallengeData({
        challengeId,
        challenger,
        timeControl,
        countdown: initialTime,
      });

      countdownIntervalRef.current = setInterval(() => {
        setChallengeData((prev) => {
          if (!prev || prev.countdown <= 1) {
            clearChallengeTimer();
            socket.emit("challenge:decline", { challengeId });
            return null;
          }
          return { ...prev, countdown: prev.countdown - 1 };
        });
      }, 1000);
    };

    const handleChallengeDeclined = ({ declinedBy }) => {
      clearChallengeTimer();
      setChallengeData(null);
      addToast(`${declinedBy || "Opponent"} declined the challenge`, "warning");
    };

    const handleChallengeExpired = () => {
      clearChallengeTimer();
      setChallengeData(null);
      addToast("Challenge expired", "info");
    };

    const handleChallengeError = ({ message }) => {
      addToast(message || "Challenge error", "error");
    };

    const handleGameStart = (data) => {
      clearChallengeTimer();
      setChallengeData(null);
      soundService.playGameStart();

      if (data && data.gameId) {
        const myColorShort = data.myColor === "white" ? "w" : "b";
        useGameStore.getState().loadGame({
          gameId: data.gameId,
          fen: data.fen,
          moves: [],
          myColor: myColorShort,
          players: {
            white:
              data.myColor === "white"
                ? { name: "You" }
                : { name: data.opponent.name },
            black:
              data.myColor === "black"
                ? { name: "You" }
                : { name: data.opponent.name },
          },
        });
        if (data.clocks) {
          useGameStore.getState().setClocks(data.clocks);
        }
        navigate(PATHS.GAME(data.gameId));
      }
    };

    socket.on("game:rematch_requested", handleRematchRequested);
    socket.on("game:rematch_declined", handleRematchDeclined);
    socket.on("game:restarted", handleGameRestarted);
    socket.on("game:draw_offered", handleDrawOffered);
    socket.on("game:draw_declined", handleDrawDeclined);

    socket.on("challenge:incoming", handleIncomingChallenge);
    socket.on("challenge:declined", handleChallengeDeclined);
    socket.on("challenge:expired", handleChallengeExpired);
    socket.on("challenge:error", handleChallengeError);
    socket.on("game:start", handleGameStart);

    return () => {
      clearChallengeTimer();
      socket.off("game:rematch_requested", handleRematchRequested);
      socket.off("game:rematch_declined", handleRematchDeclined);
      socket.off("game:restarted", handleGameRestarted);
      socket.off("game:draw_offered", handleDrawOffered);
      socket.off("game:draw_declined", handleDrawDeclined);

      socket.off("challenge:incoming", handleIncomingChallenge);
      socket.off("challenge:declined", handleChallengeDeclined);
      socket.off("challenge:expired", handleChallengeExpired);
      socket.off("challenge:error", handleChallengeError);
      socket.off("game:start", handleGameStart);
    };
  }, [
    location.pathname,
    addToast,
    showConfirmation,
    closeConfirmation,
    navigate,
  ]);

  const handleAcceptChallenge = () => {
    if (!challengeData) return;
    socket.emit("challenge:accept", { challengeId: challengeData.challengeId });
  };

  const handleDeclineChallenge = () => {
    if (!challengeData) return;
    socket.emit("challenge:decline", {
      challengeId: challengeData.challengeId,
    });
    clearChallengeTimer();
    setChallengeData(null);
  };

  const getToastIcon = (type) => {
    switch (type) {
      case "success":
        return "✓";
      case "warning":
        return "⚠";
      case "error":
        return "✗";
      default:
        return "ℹ";
    }
  };

  const getDialogIcon = (type) => {
    switch (type) {
      case "resign":
        return "🏳";
      case "lobby":
        return "🚪";
      case "rematch":
        return "🔄";
      case "draw":
        return "🤝";
      default:
        return "❓";
    }
  };

  return (
    <>
      {children}

      {/* Global Toasts Container */}
      <div className="toasts-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-card toast-${toast.type}`}
            onClick={() => removeToast(toast.id)}
          >
            <span className="toast-icon">{getToastIcon(toast.type)}</span>
            <span className="toast-message">{toast.message}</span>
            <button
              className="toast-close"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Global Challenge Modal */}
      {challengeData && (
        <div className="dialog-overlay">
          <div className="dialog-modal animation-slide-up">
            <div className="dialog-header">
              <span className="dialog-avatar avatar-rematch">⚡</span>
              <h3>Live Match Challenge!</h3>
            </div>
            <div className="dialog-body">
              <p>
                <strong>{challengeData.challenger?.username}</strong> has
                challenged you to a live chess match (
                {challengeData.timeControl?.base || 5} min).
              </p>
              <p className="challenge-countdown-text">
                Auto-declines in {challengeData.countdown}s
              </p>
            </div>
            <div className="dialog-actions">
              <button
                className="dialog-btn btn-secondary"
                onClick={handleDeclineChallenge}
              >
                Decline
              </button>
              <button
                className="dialog-btn btn-primary btn-rematch"
                onClick={handleAcceptChallenge}
              >
                Accept Challenge ⚡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Confirmation Modal */}
      {confirmation && (
        <div className="dialog-overlay">
          <div className="dialog-modal animation-slide-up">
            <div className="dialog-header">
              <span
                className={`dialog-avatar avatar-${confirmation.type || "default"}`}
              >
                {getDialogIcon(confirmation.type)}
              </span>
              <h3>{confirmation.title}</h3>
            </div>
            <div className="dialog-body">
              <p>{confirmation.message}</p>
            </div>
            <div className="dialog-actions">
              <button
                className="dialog-btn btn-secondary"
                onClick={confirmation.onCancel}
              >
                {confirmation.cancelText}
              </button>
              <button
                className={`dialog-btn btn-primary btn-${confirmation.type || "default"}`}
                onClick={confirmation.onConfirm}
              >
                {confirmation.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
