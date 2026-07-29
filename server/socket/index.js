import { socketAuthMiddleware } from "../middleware/socketAuthMiddleware.js";
import { registerMatchmakingHandlers } from "./matchmakingHandler.js";
import { registerGameHandlers } from "./gameHandler.js";
import { matchmakingManager } from "../services/MatchmakingManager.js";
import { gameManager } from "../services/GameManager.js";
import { timerManager } from "../services/TimerManager.js";
import { presenceManager } from "../services/presenceManager.js";
import { registerPresenceHandlers, broadcastPresenceToFriends } from "./presenceHandler.js";
import { registerChallengeHandlers } from "./challengeHandler.js";

export function registerSocketHandlers(io) {
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    const username = socket.data.username;

    console.log(`[Socket] Connected: ${socket.id}, username: ${username}`);
    registerMatchmakingHandlers(socket, io);
    registerGameHandlers(socket, io);
    registerPresenceHandlers(socket, io);
    registerChallengeHandlers(socket, io);

    const isFirstTab = presenceManager.addSocket(userId, socket.id);
    if (isFirstTab) {
      const currentStatus = presenceManager.getStatus(userId);
      broadcastPresenceToFriends(io, userId, currentStatus);
    }

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} , reason :${reason}`);
      matchmakingManager.leaveAll(userId);
      const game = gameManager.getGameBySocketId(socket.id);
      if (game && game.status === "active") {
        const playerInfo = gameManager.getPlayerBySocketId(game, socket.id);
        if (playerInfo) {
          playerInfo.player.online = false;
          socket.to(game.gameId).emit("game:opponent_disconnected");

          timerManager.startDisconnectTimer(
            game.gameId,
            playerInfo.player.playerId,
            () => {
              if (game.status === "active") {
                const winner = playerInfo.color === "white" ? "black" : "white";
                gameManager.endGame(game.gameId, { winner, reason: "abandonment" });
                timerManager.stopGameClock(game.gameId);
                io.to(game.gameId).emit("game:over", { winner, reason: "abandonment" });
                const player1Id = game.players.white.playerId;
                const player2Id = game.players.black.playerId;
                broadcastPresenceToFriends(io, player1Id, "online");
                broadcastPresenceToFriends(io, player2Id, "online");
                console.log(`[Game] ${game.gameId} ended by abandonment — ${winner} wins`);
              }
            }
          );
        }
      }

      const isLastTab = presenceManager.removeSocket(userId, socket.id);
      if (isLastTab) {
        broadcastPresenceToFriends(io, userId, "offline");
      }
    });
  });
}