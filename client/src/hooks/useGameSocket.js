import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../config/socket";
import { useGameStore } from "./useChess";
import { emitRejoinGame } from "../pages/game/services/gameSocket";
import { useNotificationStore } from "./useNotification";
import { PATHS } from "../app/routes/paths";
import { soundService } from "../services/soundService";

const useGameSocket = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const toast = useNotificationStore.getState().addToast;

  useEffect(() => {
    const {
      loadGame,
      applyRemoteMove,
      setClocks,
      setGameResult,
      setOpponentOnline,
      revertLastMove,
      fullReset,
    } = useGameStore.getState();

    const handleGameState = (data) => {
      console.log("[Game] State received:", data);
      const myColorShort = data.myColor === "white" ? "w" : "b";
      loadGame({
        gameId: data.gameId,
        fen: data.fen,
        moves: data.moves || [],
        myColor: myColorShort,
        players: data.players,
      });
      if (data.clocks) setClocks(data.clocks);
      if (data.result) {
        setGameResult(data.result);
        soundService.playGameOver();
      }
    };

    const handleGameMoved = (data) => {
      const myColor = useGameStore.getState().myColor;
      const turn = data.turn;

      if (turn === myColor) {
        applyRemoteMove({
          san: data.san,
          from: data.from,
          to: data.to,
          fen: data.fen,
          capturedPiece: data.capturedPiece || null,
          timestamp: Date.now(),
        });
      }
      if (data.clocks) setClocks(data.clocks);
    };

    const handleGameOver = (data) => {
      console.log("[Game] Over:", data);
      setGameResult(data);
      soundService.playGameOver();
    };

    const handleClockSync = (data) => {
      setClocks(data);
    }

    const handleMoveError = (data) => {
      console.error("[Game] Move error:", data.message);
      revertLastMove();
      soundService.playError();
      toast(data.message || "Illegal move", "error");
    };

    const handleOpponentDisconnected = () => {
      console.log("[Game] Opponent disconnected");
      setOpponentOnline(false);
      toast("Opponent has disconnected", "warning");
    };

    const handleOpponentReconnected = () => {
      console.log("[Game] Opponent reconnected");
      setOpponentOnline(true);
      toast("Opponent reconnected", "success");
    };

    const handleGameError = (data) => {
      console.error("[Game] Error:", data.message);
      soundService.playError();
      toast(data.message || "An error occurred", "error");
    };

    const handleRematchStart = (data) => {
      console.log("[Game] Rematch starting, new game:", data.gameId);
      fullReset();
      soundService.playGameStart();
      navigate(PATHS.GAME(data.gameId));
      toast("Rematch started! Colors swapped.", "success");
    };

    socket.on("game:state", handleGameState);
    socket.on("game:moved", handleGameMoved);
    socket.on("game:over", handleGameOver);
    socket.on("game:clock_sync", handleClockSync);
    socket.on("game:move_error", handleMoveError);
    socket.on("game:opponent_disconnected", handleOpponentDisconnected);
    socket.on("game:opponent_reconnected", handleOpponentReconnected);
    socket.on("game:error", handleGameError);
    socket.on("game:rematch_start", handleRematchStart);

    const doRejoin = () => {
      if (gameId) {
        console.log("[Game] Emitting game:rejoin for", gameId);
        emitRejoinGame(gameId);
      }
    };

    if (socket.connected && gameId && useGameStore.getState().gameId !== gameId) {
      doRejoin();
    }

    const handleReconnect = () => {
      console.log("[Game] Socket connected, rejoining...");
      doRejoin();
      toast("Connected to game server", "success");
    };
    socket.on("connect", handleReconnect);

    return () => {
      socket.off("game:state", handleGameState);
      socket.off("game:moved", handleGameMoved);
      socket.off("game:over", handleGameOver);
      socket.off("game:clock_sync", handleClockSync);
      socket.off("game:move_error", handleMoveError);
      socket.off("game:opponent_disconnected", handleOpponentDisconnected);
      socket.off("game:opponent_reconnected", handleOpponentReconnected);
      socket.off("game:error", handleGameError);
      socket.off("game:rematch_start", handleRematchStart);
      socket.off("connect", handleReconnect);
    };
  }, [gameId, navigate]);
};

export default useGameSocket;