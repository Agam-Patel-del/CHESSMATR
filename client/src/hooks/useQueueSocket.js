import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../config/socket";
import { useQueueStore } from "../pages/lobby/stores/queueStore";
import { useGameStore } from "./useChess";
import { useNotificationStore } from "./useNotification";
import { PATHS } from "../app/routes/paths";
import { soundService } from "../services/soundService";

export const useQueueSocket = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleQueueJoined = ({ queueKey }) => {
      console.log("[Queue]  Joined queue:", queueKey, "socketId:", socket.id);
    };

    const handleQueueLeft = ({ queueKey, cancelledQueues } = {}) => {
      console.log("[Queue] Left queue(s):", queueKey || cancelledQueues);
      if (queueKey) {
        useQueueStore.getState().removeQueue(queueKey);
      } else {
        useQueueStore.getState().reset();
      }
    };

    const handleQueueCancelled = ({ cancelledQueues } = {}) => {
      console.log("[Queue] Server cancelled queues:", cancelledQueues);
      if (cancelledQueues && cancelledQueues.length > 0) {
        useQueueStore.getState().removeQueues(cancelledQueues);
      }
    };

    const handleGameStart = (data) => {
      console.log("[Queue] Game started:", data);
      soundService.playGameStart();
      useQueueStore.getState().setMatched(data.gameId, data);

      const myColorShort = data.myColor === "white" ? "w" : "b";
      useGameStore.getState().loadGame({
        gameId: data.gameId,
        fen: data.fen,
        moves: [],
        myColor: myColorShort,
        players: {
          white: data.myColor === "white"
            ? { name: "You" }
            : { name: data.opponent.name },
          black: data.myColor === "black"
            ? { name: "You" }
            : { name: data.opponent.name },
        },
      });
      if (data.clocks) {
        useGameStore.getState().setClocks(data.clocks);
      }

      navigate(PATHS.GAME(data.gameId));
    };

    const handleQueueError = ({ message, activeGameId }) => {
      console.error("[Queue] Error:", message);
      useNotificationStore.getState().addToast(message || "Queue error", "error");

      if (activeGameId) {
        console.log("[Queue] Player has active game:", activeGameId);
        setTimeout(() => {
          navigate(PATHS.GAME(activeGameId));
        }, 1500);
      }

      useQueueStore.getState().reset();
    };

    socket.on("queue:joined", handleQueueJoined);
    socket.on("queue:left", handleQueueLeft);
    socket.on("queue:cancelled", handleQueueCancelled);
    socket.on("game:start", handleGameStart);
    socket.on("queue:error", handleQueueError);

    return () => {
      socket.off("queue:joined", handleQueueJoined);
      socket.off("queue:left", handleQueueLeft);
      socket.off("queue:cancelled", handleQueueCancelled);
      socket.off("game:start", handleGameStart);
      socket.off("queue:error", handleQueueError);

      const state = useQueueStore.getState();
      if (Object.keys(state.activeQueues).length > 0) {
        console.log("[Queue] Unmounting while searching, leaving all queues...");
        socket.emit("queue:leave", {});
        state.reset();
      }
    };
  }, [navigate]);

  const joinQueue = (timeControl) => {
    const queueKey = `queue_${timeControl.base}_${timeControl.increment}`;
    console.log("[Queue] Joining queue:", queueKey);
    useQueueStore.getState().addQueue(queueKey, timeControl);
    socket.emit("queue:join", { timeControl });
  };

  const leaveQueue = (queueKey) => {
    if (queueKey) {
      console.log("[Queue] Leaving specific queue:", queueKey);
      socket.emit("queue:leave", { queueKey });
      useQueueStore.getState().removeQueue(queueKey);
    } else {
      console.log("[Queue] Leaving all queues...");
      socket.emit("queue:leave", {});
      useQueueStore.getState().reset();
    }
  };

  return { joinQueue, leaveQueue };
};