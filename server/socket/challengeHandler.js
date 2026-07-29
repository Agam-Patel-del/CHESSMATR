import { presenceManager } from "../services/presenceManager.js";
import { gameManager } from "../services/GameManager.js";
import { timerManager } from "../services/TimerManager.js";
import { broadcastPresenceToFriends } from "./presenceHandler.js";
import { User } from "../models/index.js";

const activeChallenges = new Map();

export function registerChallengeHandlers(socket, io) {
  const userId = socket.data.userId;
  const username = socket.data.username;

  socket.on("challenge:send", async ({ toUserId, timeControl }) => {
    try {
      if (!userId || !toUserId) return;
      if (userId.toString() === toUserId.toString()) {
        return socket.emit("challenge:error", { message: "You cannot challenge yourself." });
      }

      const user = await User.findById(userId).select("friends").lean();
      const isFriend = user?.friends?.some(
        (friendObjectId) => friendObjectId.toString() === toUserId.toString()
      );
      if (!isFriend) {
        return socket.emit("challenge:error", { message: "Only friends can be challenged." });
      }

      const targetStatus = presenceManager.getStatus(toUserId);
      if (targetStatus !== "online") {
        return socket.emit("challenge:error", {
          message: targetStatus === "in_game" ? "Friend is currently in a game." : "Friend is offline.",
        });
      }
      if (gameManager.isPlayerInActiveGame(userId) || gameManager.isPlayerInActiveGame(toUserId)) {
        return socket.emit("challenge:error", { message: "One of the players is already in a game." });
      }

      const challengeId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const selectedTimeControl = timeControl || { base: 5, increment: 0 };
      const timeoutId = setTimeout(() => {
        if (activeChallenges.has(challengeId)) {
          activeChallenges.delete(challengeId);
          const challengerSockets = presenceManager.getSocketIdsforUser(userId);
          const targetSockets = presenceManager.getSocketIdsforUser(toUserId);

          for (const socketId of challengerSockets) {
            io.to(socketId).emit("challenge:expired", { challengeId });
          }
          for (const socketId of targetSockets) {
            io.to(socketId).emit("challenge:expired", { challengeId });
          }
        }
      }, 30000);

      activeChallenges.set(challengeId, {
        challengeId,
        challengerId: userId.toString(),
        challengerName: username,
        targetId: toUserId.toString(),
        timeControl: selectedTimeControl,
        timeoutId,
      });

      const targetSockets = presenceManager.getSocketIdsforUser(toUserId);
      for (const socketId of targetSockets) {
        io.to(socketId).emit("challenge:incoming", {
          challengeId,
          challenger: {
            id: userId.toString(),
            username,
          },
          timeControl: selectedTimeControl,
          expiresInSeconds: 30,
        });
      }

      socket.emit("challenge:sent", { challengeId, targetId: toUserId });
    } catch (error) {
      console.error("[Challenge Send Error]", error);
      socket.emit("challenge:error", { message: "Could not send challenge." });
    }
  });

  socket.on("challenge:accept", async ({ challengeId }) => {
    try {
      const challenge = activeChallenges.get(challengeId);
      if (!challenge) {
        return socket.emit("challenge:error", { message: "Challenge expired or invalid." });
      }

      if (challenge.targetId !== userId.toString()) {
        return socket.emit("challenge:error", { message: "Unauthorized challenge response." });
      }
      clearTimeout(challenge.timeoutId);
      activeChallenges.delete(challengeId);

      const challengerSockets = presenceManager.getSocketIdsforUser(challenge.challengerId);
      const targetSockets = presenceManager.getSocketIdsforUser(challenge.targetId);
      const challengerSocketId = challengerSockets[0] || socket.id;
      const targetSocketId = socket.id;

      const player1 = {
        playerId: challenge.challengerId,
        socketId: challengerSocketId,
        playerName: challenge.challengerName,
      };

      const player2 = {
        playerId: challenge.targetId,
        socketId: targetSocketId,
        playerName: username,
      };

      const game = gameManager.createGame(player1, player2, challenge.timeControl);

      broadcastPresenceToFriends(io, player1.playerId, "in_game");
      broadcastPresenceToFriends(io, player2.playerId, "in_game");

      for (const socketId of challengerSockets) {
        const socketInstance = io.sockets.sockets.get(socketId);
        if (socketInstance) socketInstance.join(game.gameId);
      }
      for (const socketId of targetSockets) {
        const socketInstance = io.sockets.sockets.get(socketId);
        if (socketInstance) socketInstance.join(game.gameId);
      }

      timerManager.startGameClock(game.gameId, game, io);

      const buildStartPayload = (myColor) => {
        const opponentColor = myColor === "white" ? "black" : "white";
        const opponent = game.players[opponentColor];
        return {
          gameId: game.gameId,
          myColor,
          opponent: { name: opponent.playerName },
          timeControl: { base: game.timeControl.base, increment: game.timeControl.increment },
          fen: game.chess.fen(),
          clocks: {
            white: game.clocks.white.remaining,
            black: game.clocks.black.remaining,
          },
        };
      };

      const player1Color = game.players.white.socketId === player1.socketId ? "white" : "black";
      const player2Color = player1Color === "white" ? "black" : "white";

      for (const socketId of challengerSockets) {
        io.to(socketId).emit("game:start", buildStartPayload(player1Color));
      }
      for (const socketId of targetSockets) {
        io.to(socketId).emit("game:start", buildStartPayload(player2Color));
      }
    } catch (error) {
      console.error("[Challenge Accept Error]", error);
      socket.emit("challenge:error", { message: "Failed to accept challenge." });
    }
  });

  socket.on("challenge:decline", async ({ challengeId }) => {
    try {
      const challenge = activeChallenges.get(challengeId);
      if (!challenge) return;

      clearTimeout(challenge.timeoutId);
      activeChallenges.delete(challengeId);

      const challengerSockets = presenceManager.getSocketIdsforUser(challenge.challengerId);
      for (const socketId of challengerSockets) {
        io.to(socketId).emit("challenge:declined", {
          challengeId,
          declinedBy: username,
        });
      }
    } catch (error) {
      console.error("[Challenge Decline Error]", error);
    }
  });
}