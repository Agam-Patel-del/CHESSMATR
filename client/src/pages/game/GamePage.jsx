import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useChess, useGameStore } from "../../hooks/useChess";
import ChessBoard from "./ChessBoard";
import useGameSocket from "../../hooks/useGameSocket";
import { emitResign } from "./services/gameSocket";
import { useAuth } from "../../providers/AuthProvider";
import { PATHS } from "../../app/routes/paths";
import { useNotificationStore } from "../../hooks/useNotification";
import { socket } from "../../config/socket";
import "./GamePage.css";

const getCapturedPiecesAndScore = (fen) => {
  if (!fen)
    return { whiteCaptured: [], blackCaptured: [], whiteDiff: 0, blackDiff: 0 };

  const startingCount = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  const remainingCount = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  };

  const boardPart = fen.split(" ")[0];
  let whiteMaterial = 0;
  let blackMaterial = 0;

  for (const char of boardPart) {
    if (char === "/") continue;
    if (char >= "1" && char <= "8") continue;

    const isWhite = char === char.toUpperCase();
    const type = char.toLowerCase();
    const color = isWhite ? "w" : "b";

    if (type !== "k") {
      remainingCount[color][type] = (remainingCount[color][type] || 0) + 1;

      const val = pieceValues[type] || 0;
      if (isWhite) {
        whiteMaterial += val;
      } else {
        blackMaterial += val;
      }
    }
  }

  const whiteCaptured = [];
  const blackCaptured = [];
  const pieceOrder = ["q", "r", "b", "n", "p"];

  for (const type of pieceOrder) {
    const capturedBlackCount =
      startingCount[type] - (remainingCount.b[type] || 0);
    for (let i = 0; i < capturedBlackCount; i++) {
      whiteCaptured.push({ type, color: "b" });
    }

    const capturedWhiteCount =
      startingCount[type] - (remainingCount.w[type] || 0);
    for (let i = 0; i < capturedWhiteCount; i++) {
      blackCaptured.push({ type, color: "w" });
    }
  }

  let whiteDiff = 0;
  let blackDiff = 0;
  if (whiteMaterial > blackMaterial) {
    whiteDiff = whiteMaterial - blackMaterial;
  } else if (blackMaterial > whiteMaterial) {
    blackDiff = blackMaterial - whiteMaterial;
  }

  return {
    whiteCaptured,
    blackCaptured,
    whiteDiff,
    blackDiff,
  };
};

const renderCapturedPieces = (capturedList) => {
  const symbolMap = {
    w: { q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
    b: { q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
  };

  const counts = { q: 0, r: 0, b: 0, n: 0, p: 0 };
  let color = "b";
  for (const piece of capturedList) {
    counts[piece.type]++;
    color = piece.color;
  }

  const pieceOrder = ["q", "r", "b", "n", "p"];

  return (
    <div className="captured-pieces-list">
      {pieceOrder.map((type) => {
        const count = counts[type];
        if (count === 0) return null;

        if (count > 2) {
          return (
            <div key={type} className="captured-piece-group">
              <span
                className={`captured-piece ${color === "w" ? "captured-white" : "captured-black"}`}
              >
                {symbolMap[color][type]}
              </span>
              {count > 1 && (
                <span className="captured-piece-multiplier">{count}</span>
              )}
            </div>
          );
        } else {
          const items = [];
          for (let i = 0; i < count; i++) {
            items.push(
              <span
                key={`${type}-${i}`}
                className={`captured-piece ${color === "w" ? "captured-white" : "captured-black"}`}
                style={{ marginRight: "1px" }}
              >
                {symbolMap[color][type]}
              </span>,
            );
          }
          return (
            <div key={type} className="captured-piece-group">
              {items}
            </div>
          );
        }
      })}
    </div>
  );
};

const formatTime = (ms) => {
  if (ms < 0) ms = 0;
  const secs = Math.ceil(ms / 1000);
  const min = Math.floor(secs / 60);
  const sec = secs % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export const GamePage = () => {
  useGameSocket();

  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { fen, moves, status } = useChess();
  const myColor = useGameStore((s) => s.myColor);
  const players = useGameStore((s) => s.players);
  const opponentOnline = useGameStore((s) => s.opponentOnline);
  const clocks = useGameStore((s) => s.clocks);

  const isGameOver = status?.isGameOver;
  const gameResult = status?.result ?? null;

  const [displayClocks, setDisplayClocks] = useState({ white: 0, black: 0 });
  const hasToastedGameOverRef = useRef(false);

  useEffect(() => {
    if (clocks) setDisplayClocks({ white: clocks.white, black: clocks.black });
  }, [clocks]);

  useEffect(() => {
    if (isGameOver || moves.length === 0) return;
    const interval = setInterval(() => {
      const turn = status?.turn;
      if (!turn) return;
      setDisplayClocks((prev) => {
        const key = turn === "w" ? "white" : "black";
        return {
          ...prev,
          [key]: Math.max(0, prev[key] - 100),
        };
      });
    }, 100);
    return () => clearInterval(interval);
  }, [status?.turn, isGameOver, moves.length]);

  const formattedMoves = [];
  for (let i = 0; i < moves.length; i += 2) {
    formattedMoves.push({
      num: Math.floor(i / 2) + 1,
      white: moves[i]?.san ?? "",
      black: moves[i + 1]?.san ?? "",
    });
  }

  const isWhite = myColor === "w";
  const opponentName = players
    ? ((isWhite ? players.black?.name : players.white?.name) ?? "Opponent")
    : "Waiting...";

  const { whiteCaptured, blackCaptured, whiteDiff, blackDiff } =
    getCapturedPiecesAndScore(fen);

  const topCaptured = isWhite ? blackCaptured : whiteCaptured;
  const topDiff = isWhite ? blackDiff : whiteDiff;
  const bottomCaptured = isWhite ? whiteCaptured : blackCaptured;
  const bottomDiff = isWhite ? whiteDiff : blackDiff;

  const topClock = isWhite ? displayClocks.black : displayClocks.white;
  const bottomClock = isWhite ? displayClocks.white : displayClocks.black;
  const topTurn = isWhite ? "b" : "w";
  const bottomTurn = isWhite ? "w" : "b";
  const showConfirmation = useNotificationStore((s) => s.showConfirmation);
  const addToast = useNotificationStore((s) => s.addToast);

  useEffect(() => {
    if (!isGameOver) {
      hasToastedGameOverRef.current = false;
      return;
    }

    if (hasToastedGameOverRef.current) return;
    hasToastedGameOverRef.current = true;

    let toastText = "Game over.";
    let toastType = "info";

    if (gameResult) {
      const { winner, reason } = gameResult;
      const isDraw = winner === "draw";
      const iWon =
        (winner === "white" && isWhite) || (winner === "black" && !isWhite);

      const formattedReason =
        reason === "checkmate"
          ? "checkmate"
          : reason === "resignation"
            ? "resignation"
            : reason === "timeout"
              ? "time out"
              : reason === "abandonment"
                ? "abandonment"
                : reason === "draw_agreement"
                  ? "draw offer"
                  : reason === "stalemate"
                    ? "stalemate"
                    : reason.replace(/_/g, " ");

      if (isDraw) {
        toastText = `Game Over: Match drawn by ${formattedReason}.`;
        toastType = "info";
      } else if (iWon) {
        toastText = `Victory! You won by ${formattedReason}.`;
        toastType = "success";
      } else {
        toastText = `Defeat: Opponent won by ${formattedReason}.`;
        toastType = "error";
      }
    } else if (status?.isCheckmate) {
      const turn = status.turn;
      const iWon = (turn === "b" && isWhite) || (turn === "w" && !isWhite);
      toastText = iWon
        ? "Victory! You won by checkmate."
        : "Defeat: Opponent won by checkmate.";
      toastType = iWon ? "success" : "error";
    } else if (status?.isStalemate) {
      toastText = "Game Over: Match drawn by stalemate.";
      toastType = "info";
    } else if (status?.isDraw) {
      toastText = "Game Over: Match drawn.";
      toastType = "info";
    }

    addToast(toastText, toastType);
  }, [isGameOver, gameResult, status, isWhite, addToast]);

  const handleResign = useCallback(() => {
    if (gameId && !isGameOver) {
      showConfirmation({
        title: "Confirm Resignation",
        message:
          "Are you sure you want to resign the game? This counts as an immediate loss.",
        confirmText: "Resign",
        cancelText: "Keep Playing",
        type: "resign",
        onConfirm: () => {
          emitResign(gameId);
        },
      });
    }
  }, [gameId, isGameOver, showConfirmation]);

  const handleDrawOffer = useCallback(() => {
    if (gameId && !isGameOver) {
      socket.emit("game:draw_offer", { gameId });
      addToast("Draw offer sent to opponent", "info");
    }
  }, [gameId, isGameOver, addToast]);

  const handleBackToLobby = useCallback(() => {
    if (!isGameOver) {
      showConfirmation({
        title: "Leave Active Match?",
        message:
          "You are currently in an active game. Exiting will forfeit the match and count as a loss.",
        confirmText: "Leave Game",
        cancelText: "Stay",
        type: "lobby",
        onConfirm: () => {
          useGameStore.getState().fullReset();
          navigate(PATHS.LOBBY);
        },
      });
    } else {
      useGameStore.getState().fullReset();
      navigate(PATHS.LOBBY);
    }
  }, [isGameOver, navigate, showConfirmation]);

  const handleRematchRequest = useCallback(() => {
    if (gameId) {
      socket.emit("game:rematch_request", { gameId });
      addToast("Rematch request sent to opponent", "info");
    }
  }, [gameId, addToast]);

  const getStatusText = () => {
    if (!status) return "Initializing game...";
    if (gameResult) {
      const { winner, reason } = gameResult;
      if (reason === "checkmate")
        return `Checkmate! ${winner === "white" ? "White" : "Black"} wins.`;
      if (reason === "timeout")
        return `Time's up! ${winner === "white" ? "White" : "Black"} wins on time.`;
      if (reason === "resignation")
        return `${winner === "white" ? "White" : "Black"} wins by resignation.`;
      if (reason === "abandonment")
        return `${winner === "white" ? "White" : "Black"} wins by abandonment.`;
      if (winner === "draw") return `Draw by ${reason}.`;
      return "Game over.";
    }
    if (status.isCheckmate)
      return `Checkmate! ${status.turn === "w" ? "Black" : "White"} wins.`;
    if (status.isStalemate) return "Stalemate! Draw.";
    if (status.isDraw) return "Draw!";
    if (status.inCheck)
      return `${status.turn === "w" ? "White" : "Black"} is in check!`;
    return `${status.turn === "w" ? "White" : "Black"} to move`;
  };

  const getStatusClass = () => {
    if (!status) return "status-initializing";
    if (gameResult || status.isCheckmate) return "status-gameover";
    if (status.isDraw || status.isStalemate) return "status-draw";
    if (status.inCheck) return "status-check";
    return status.turn === "w" ? "status-white" : "status-black";
  };

  return (
    <div className="game-page-container">
      <div className="board-section">
        {/* Opponent (top of board) */}
        <div className="player-tag" style={{ marginBottom: "20px" }}>
          <div className="player-details">
            <div
              className="player-avatar"
              style={
                isWhite
                  ? { backgroundColor: "#5C4033", color: "#FFFFFF" }
                  : { backgroundColor: "#C4B9AA", color: "#2D2422" }
              }
            >
              {isWhite ? "B" : "W"}
            </div>
            <div className="player-info-meta">
              <div className="player-name-row">
                {players ? (
                  <Link
                    to={PATHS.PROFILE(
                      isWhite ? players.black?.id : players.white?.id,
                    )}
                    className="player-name-link"
                  >
                    {opponentName}
                  </Link>
                ) : (
                  <span className="player-name">{opponentName}</span>
                )}
                {!opponentOnline && (
                  <span className="disconnect-badge"> ● Disconnected</span>
                )}
              </div>
              <div className="player-captures-row">
                {renderCapturedPieces(topCaptured)}
                {topDiff > 0 && (
                  <span className="score-difference">+{topDiff}</span>
                )}
              </div>
            </div>
          </div>
          <div
            className={`player-timer ${status?.turn === topTurn && !isGameOver ? "timer-active" : ""} ${topClock <= 30000 ? "timer-low" : ""}`}
          >
            {formatTime(topClock)}
          </div>
        </div>

        <div style={{ margin: "12px 0" }}>
          <ChessBoard />
        </div>

        {/* You (bottom of board) */}
        <div className="player-tag" style={{ marginTop: "20px" }}>
          <div className="player-details">
            <div
              className="player-avatar"
              style={
                isWhite
                  ? { backgroundColor: "#C4B9AA", color: "#2D2422" }
                  : { backgroundColor: "#5C4033", color: "#FFFFFF" }
              }
            >
              {isWhite ? "W" : "B"}
            </div>
            <div className="player-info-meta">
              <div className="player-name-row">
                {user ? (
                  <Link
                    to={PATHS.PROFILE(user.id)}
                    className="player-name-link"
                  >
                    {user.username}
                  </Link>
                ) : (
                  <span className="player-name">You</span>
                )}
              </div>
              <div className="player-captures-row">
                {renderCapturedPieces(bottomCaptured)}
                {bottomDiff > 0 && (
                  <span className="score-difference">+{bottomDiff}</span>
                )}
              </div>
            </div>
          </div>
          <div
            className={`player-timer ${status?.turn === bottomTurn && !isGameOver ? "timer-active" : ""} ${bottomClock <= 30000 ? "timer-low" : ""}`}
          >
            {formatTime(bottomClock)}
          </div>
        </div>
      </div>

      <div className="game-sidebar-panel">
        {/* Status card */}
        <section className="game-info-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0 }}>Match Status</h3>
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
          <div className={`status-indicator ${getStatusClass()}`}>
            <span className="status-dot"></span>
            <span className="status-text">{getStatusText()}</span>
          </div>
          {!opponentOnline && !isGameOver && (
            <p className="game-hint" style={{ color: "#A35C4E" }}>
              Opponent disconnected. They have 60 seconds to reconnect.
            </p>
          )}
          <p className="game-hint">
            {isGameOver
              ? "The game has ended."
              : "Drag pieces to make your move."}
          </p>
        </section>

        {/* Score sheet */}
        <section className="game-info-card score-sheet-card">
          <h3>Score Sheet</h3>
          <div className="move-history-container">
            {formattedMoves.length > 0 ? (
              <div className="move-history-list">
                {formattedMoves.map((m) => (
                  <React.Fragment key={m.num}>
                    <div className="move-number">{m.num}.</div>
                    <div className="move-notation white-move">{m.white}</div>
                    <div className="move-notation black-move">{m.black}</div>
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="no-moves-placeholder">
                <p>No moves played yet</p>
                <span>The battle has not yet begun.</span>
              </div>
            )}
          </div>

          <div className="game-controls">
            {isGameOver ? (
              <>
                <button
                  className="game-control-btn btn-rematch-request"
                  onClick={handleRematchRequest}
                >
                  Play Again
                </button>
                <button
                  className="game-control-btn btn-restart"
                  onClick={handleBackToLobby}
                >
                  Back to Lobby
                </button>
              </>
            ) : (
              <>
                <button
                  className="game-control-btn btn-draw-offer"
                  onClick={handleDrawOffer}
                >
                  Offer Draw
                </button>
                <button
                  className="game-control-btn btn-resign"
                  onClick={handleResign}
                >
                  Resign
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
