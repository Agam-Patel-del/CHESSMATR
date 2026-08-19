import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { PATHS } from "../../app/routes/paths";
import { useNotificationStore } from "../../hooks/useNotification";
import { soundService } from "../../services/soundService";
import "./ReviewPage.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const ReviewPage = () => {
  const { gameId } = useParams();
  const [gameData, setGameData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [orientation, setOrientation] = useState("white");
  const addToast = useNotificationStore((s) => s.addToast);
  const moveListRef = useRef(null);

  useEffect(() => {
    const fetchGame = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/users/game/${gameId}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setGameData(data.game);
          setCurrentMoveIndex(-1);
        } else {
          const errorData = await res.json().catch(() => ({}));
          setError(errorData.error || "Game not found");
          addToast("Failed to load game data", "error");
        }
      } catch (err) {
        console.error("Error fetching game:", err);
        setError("Connection error");
        addToast("Connection error. Could not fetch game.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    if (gameId) fetchGame();
  }, [gameId, addToast]);

  const currentFen = useCallback(() => {
    if (!gameData) return START_FEN;
    if (currentMoveIndex < 0) return START_FEN;
    const move = gameData.moves[currentMoveIndex];
    if (move?.fen) return move.fen;
  }, [gameData, currentMoveIndex]);

  const goToStart = useCallback(() => {
    soundService.playMove();
    setCurrentMoveIndex(-1);
  }, []);

  const goToEnd = useCallback(() => {
    if (gameData) {
      soundService.playMove();
      setCurrentMoveIndex(gameData.moves.length - 1);
    }
  }, [gameData]);

  const goForward = useCallback(() => {
    if (gameData && currentMoveIndex < gameData.moves.length - 1) {
      const nextMove = gameData.moves[currentMoveIndex + 1];
      if (nextMove?.capturedPiece) soundService.playCapture();
      else soundService.playMove();
      setCurrentMoveIndex((i) => i + 1);
    }
  }, [gameData, currentMoveIndex]);

  const goBack = useCallback(() => {
    if (currentMoveIndex >= 0) {
      soundService.playMove();
      setCurrentMoveIndex((i) => i - 1);
    }
  }, [currentMoveIndex]);

  const goToMove = useCallback(
    (index) => {
      if (gameData && gameData.moves[index]?.capturedPiece) {
        soundService.playCapture();
      } else {
        soundService.playMove();
      }
      setCurrentMoveIndex(index);
    },
    [gameData],
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goForward();
      } else if (e.key === "Home") {
        e.preventDefault();
        goToStart();
      } else if (e.key === "End") {
        e.preventDefault();
        goToEnd();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack, goForward, goToStart, goToEnd]);

  useEffect(() => {
    if (moveListRef.current) {
      const activeEl = moveListRef.current.querySelector(".active-move");
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [currentMoveIndex]);

  if (isLoading) {
    return <div className="review-loading">Loading game...</div>;
  }

  if (error || !gameData) {
    return <div className="review-error">{error || "Game not found"}</div>;
  }

  const formatClockTime = (ms) => {
    if (ms == null || isNaN(ms)) return "00:00";
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const getClocksForMoveIndex = (gData, index) => {
    if (!gData) return { white: 0, black: 0 };
    const baseMs = gData.timeControl.base;

    if (index < 0) {
      return { white: baseMs, black: baseMs };
    }

    const currentMove = gData.moves[index];
    if (currentMove && currentMove.clocks) {
      return {
        white: currentMove.clocks.white,
        black: currentMove.clocks.black,
      };
    }

    return { white: baseMs, black: baseMs };
  };

  const movePairs = [];
  for (let i = 0; i < gameData.moves.length; i += 2) {
    const whiteMove = gameData.moves[i];
    const blackMove = gameData.moves[i + 1];
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: {
        san: whiteMove?.san || "",
        index: i,
      },
      black: blackMove
        ? {
            san: blackMove.san,
            index: i + 1,
          }
        : null,
    });
  }

  const { winner, reason } = gameData.result;
  let resultText = "";
  let resultIcon = "";
  let resultClass = "";
  if (winner === "draw") {
    resultText = "½ – ½  Draw";
    resultIcon = "🤝";
    resultClass = "draw-result";
  } else {
    resultText = `${winner === "white" ? "White" : "Black"} wins`;
    resultIcon = winner === "white" ? "♔" : "♚";
    resultClass = "win-result";
  }

  let reasonLabel = null;
  if (reason === "checkmate") reasonLabel = "Checkmate";
  else if (reason === "timeout") reasonLabel = "On time";
  else if (reason === "resignation") reasonLabel = "Resignation";
  else if (reason === "abandonment") reasonLabel = "Abandonment";
  else if (reason === "draw_agreement") reasonLabel = "Draw Agreement";
  else if (reason === "stalemate") reasonLabel = "Stalemate";
  else if (reason === "threefold_repetition")
    reasonLabel = "Threefold Repetition";
  else if (reason === "insufficient_material")
    reasonLabel = "Insufficient Material";
  else if (reason === "fifty_move_rule") reasonLabel = "Fifty Move Rule";
  else reasonLabel = reason.replace(/_/g, " ");

  const minutes = Math.round(gameData.timeControl.base / 60000);
  const incSeconds = Math.round(gameData.timeControl.increment / 1000);
  const tcLabel =
    incSeconds > 0 ? `${minutes}+${incSeconds}` : `${minutes} min`;

  const dateLabel = new Date(gameData.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const posLabel =
    currentMoveIndex < 0
      ? "Starting position"
      : `Move ${currentMoveIndex + 1} of ${gameData.moves.length}`;

  const totalMoves = Math.ceil(gameData.moves.length / 2);

  const currentClocks = getClocksForMoveIndex(gameData, currentMoveIndex);
  const topClockMs =
    orientation === "white" ? currentClocks.black : currentClocks.white;
  const bottomClockMs =
    orientation === "white" ? currentClocks.white : currentClocks.black;

  const activeTurnColor =
    currentMoveIndex < 0
      ? "white"
      : currentMoveIndex % 2 === 0
        ? "black"
        : "white";

  const topColor = orientation === "white" ? "black" : "white";
  const bottomColor = orientation === "white" ? "white" : "black";

  const isTopActive = activeTurnColor === topColor;
  const isBottomActive = activeTurnColor === bottomColor;

  return (
    <div className="review-container">
      {/* ─── Board Panel ─── */}
      <div className="review-board-panel">
        {/* Top player */}
        <div className="review-player-bar top">
          <div className="review-player-info">
            <div
              className={`review-player-avatar ${orientation === "white" ? "black-avatar" : "white-avatar"}`}
            >
              {orientation === "white" ? "B" : "W"}
            </div>
            <Link
              to={PATHS.PROFILE(
                orientation === "white"
                  ? gameData.players.black.id
                  : gameData.players.white.id,
              )}
              className="review-player-name"
            >
              {orientation === "white"
                ? gameData.players.black.name
                : gameData.players.white.name}
            </Link>
          </div>
          <div
            className={`review-player-timer ${isTopActive ? "timer-active" : ""}`}
            title={`Remaining time for ${topColor}`}
          >
            {formatClockTime(topClockMs)}
          </div>
        </div>

        {/* Chessboard */}
        <div style={{ width: "100%", maxWidth: "500px" }}>
          <Chessboard
            options={{
              position: currentFen(),
              boardOrientation: orientation,
              animationDurationInMs: 200,
              allowDragging: false,
            }}
          />
        </div>

        {/* Bottom player */}
        <div className="review-player-bar bottom">
          <div className="review-player-info">
            <div
              className={`review-player-avatar ${orientation === "white" ? "white-avatar" : "black-avatar"}`}
            >
              {orientation === "white" ? "W" : "B"}
            </div>
            <Link
              to={PATHS.PROFILE(
                orientation === "white"
                  ? gameData.players.white.id
                  : gameData.players.black.id,
              )}
              className="review-player-name"
            >
              {orientation === "white"
                ? gameData.players.white.name
                : gameData.players.black.name}
            </Link>
          </div>
          <div
            className={`review-player-timer ${isBottomActive ? "timer-active" : ""}`}
            title={`Remaining time for ${bottomColor}`}
          >
            {formatClockTime(bottomClockMs)}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="review-board-controls">
          <button
            className="review-nav-btn"
            onClick={goToStart}
            disabled={currentMoveIndex < 0}
            title="First move (Home)"
          >
            ⏮
          </button>
          <button
            className="review-nav-btn"
            onClick={goBack}
            disabled={currentMoveIndex < 0}
            title="Previous move (←)"
          >
            ◀
          </button>
          <button
            className="review-flip-btn"
            onClick={() =>
              setOrientation((o) => (o === "white" ? "black" : "white"))
            }
            title="Flip board"
          >
            🔄
          </button>
          <button
            className="review-nav-btn"
            onClick={goForward}
            disabled={
              !gameData || currentMoveIndex >= gameData.moves.length - 1
            }
            title="Next move (→)"
          >
            ▶
          </button>
          <button
            className="review-nav-btn"
            onClick={goToEnd}
            disabled={
              !gameData || currentMoveIndex >= gameData.moves.length - 1
            }
            title="Last move (End)"
          >
            ⏭
          </button>
        </div>
      </div>

      {/* ─── Sidebar ─── */}
      <div className="review-sidebar">
        {/* Result & Info card */}
        <div className="review-info-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h3 style={{ margin: 0 }}>Game Summary</h3>
            <Link
              to={PATHS.SETTINGS}
              target="_blank"
              rel="noopener noreferrer"
              title="Settings"
              style={{
                color: "var(--text-secondary, #5C504D)",
                textDecoration: "none",
                fontSize: "1.1rem",
                cursor: "pointer",
              }}
            >
              ⚙
            </Link>
          </div>

          <div
            className={`review-result-banner ${resultClass}`}
            style={{ justifyContent: "space-between" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="review-result-icon">{resultIcon}</span>
              <div>
                <div className="review-result-text">{resultText}</div>
                <div className="review-result-reason">{reasonLabel}</div>
              </div>
            </div>
            <div
              style={{
                textAlign: "right",
                color: "var(--text-secondary, #8C7A76)",
                fontSize: "0.85rem",
                fontWeight: "500",
              }}
            >
              {dateLabel}
            </div>
          </div>

          <div className="review-meta-grid">
            <div className="review-meta-item">
              <span className="review-meta-label">Time Control</span>
              <span className="review-meta-value">{tcLabel}</span>
            </div>
            <div className="review-meta-item">
              <span className="review-meta-label">Total Moves</span>
              <span className="review-meta-value">{totalMoves}</span>
            </div>
          </div>
        </div>

        {/* Move list card */}
        <div className="review-move-list-card">
          <h3>Moves</h3>
          <div className="review-move-position-label">{posLabel}</div>
          <div className="review-moves-container" ref={moveListRef}>
            <div className="review-moves-grid">
              {movePairs.map((pair) => (
                <div className="review-move-row" key={pair.num}>
                  <div className="review-move-number">{pair.num}.</div>
                  <div
                    className={`review-move-cell ${currentMoveIndex === pair.white.index ? "active-move" : ""}`}
                    onClick={() => goToMove(pair.white.index)}
                  >
                    {pair.white.san}
                  </div>
                  {pair.black ? (
                    <div
                      className={`review-move-cell ${currentMoveIndex === pair.black.index ? "active-move" : ""}`}
                      onClick={() => goToMove(pair.black.index)}
                    >
                      {pair.black.san}
                    </div>
                  ) : (
                    <div className="review-move-cell empty-cell" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Back to history */}
        <Link to={PATHS.HISTORY} className="review-back-link">
          ← Back to History
        </Link>
      </div>
    </div>
  );
};
