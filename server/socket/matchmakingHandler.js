import { matchmakingManager } from "../services/MatchmakingManager.js";
import { gameManager } from "../services/GameManager.js";
import { timerManager } from "../services/TimerManager.js";
import { presenceManager } from "../services/presenceManager.js";
import { broadcastPresenceToFriends } from "./presenceHandler.js";

export function registerMatchmakingHandlers(socket, io) {
  socket.on("queue:join", ({ timeControl } = {}) => {
    console.log(`[MatchmakingHandler] queue:join received from: ${socket.id} timeControl: ${timeControl}`);

    if (!timeControl || typeof timeControl.base !== "number" || typeof timeControl.increment !== "number") {
      console.log(`[MatchmakingHandler].. Invalid timeControl format`);
      return socket.emit("queue:error", { message: "Invalid time control payload" });
    }

    const playerId = socket.data.userId;
    const playerName = socket.data.username;

    if (gameManager.isPlayerInActiveGame(playerId)) {
      const activeGame = gameManager.getActiveGameByPlayerId(playerId);
      console.log(`[MatchmakingHandler] Player already in active game: ${activeGame.gameId}`);
      return socket.emit("queue:error", {
        message: "You are already in an active game",
        activeGameId: activeGame.gameId,
      });
    }

    const result = matchmakingManager.join(socket.id, playerId, playerName, timeControl);
    if (!result.success) {
      console.log(`[MatchmakingHandler] Join failed, error: ${result.error}`);
      return socket.emit("queue:error", { message: result.error });
    }

    const { queueKey } = result;
    socket.emit("queue:joined", { queueKey });

    console.log(`[MatchmakingHandler] ${playerName} joined ${queueKey} (total queues: ${matchmakingManager.getPlayerQueues(playerId).length})`);
    const match = matchmakingManager.tryMatch(queueKey);
    if (!match) {
      console.log(`[MatchmakingHandler] Waiting for opponent in ${queueKey}`);
      return;
    }

    const { player1, player2, cancelledQueues } = match;
    console.log(`[MatchmakingHandler]  Match found: ${player1.playerName} vs ${player2.playerName}`);

    for (const [matchedPlayerId, cancelled] of Object.entries(cancelledQueues)) {
      if (cancelled.length > 0) {
        const playerSocketId = matchedPlayerId === player1.playerId ? player1.socketId : player2.socketId;
        const playerSocket = io.sockets.sockets.get(playerSocketId);
        if (playerSocket) {
          playerSocket.emit("queue:cancelled", { cancelledQueues: cancelled });
          console.log(`[MatchmakingHandler] Notified ${matchedPlayerId.substring(0, 8)} of cancelled queues:`, cancelled);
        }
      }
    }

    console.log(`[MatchmakingHandler] Creating game with timeControl: ${timeControl}`);
    const game = gameManager.createGame(player1, player2, timeControl);
    console.log("[MatchmakingHandler] Game created:", game.gameId);

    broadcastPresenceToFriends(io, player1.playerId, "in_game");
    broadcastPresenceToFriends(io, player2.playerId, "in_game");
    const p1Socket = io.sockets.sockets.get(player1.socketId);
    const p2Socket = io.sockets.sockets.get(player2.socketId);

    console.log(`[MatchmakingHandler] P1Socket exists: ${!!p1Socket}, P2Socket exists: ${!!p2Socket}`);

    if (p1Socket) {
      p1Socket.join(game.gameId);
      console.log(`[MatchmakingHandler] P1 joined room: ${game.gameId}`);
    }
    if (p2Socket) {
      p2Socket.join(game.gameId);
      console.log(`[MatchmakingHandler] P2 joined room: ${game.gameId}`);
    }

    timerManager.startGameClock(game.gameId, game, io);
    console.log(`[MatchmakingHandler] Game clock started`);

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

    const p1Color = game.players.white.socketId === player1.socketId ? "white" : "black";
    const p2Color = p1Color === "white" ? "black" : "white";

    if (p1Socket) {
      const payload = buildStartPayload(p1Color);
      console.log("[MatchmakingHandler] Emitting game:start to P1:", payload);
      p1Socket.emit("game:start", payload);
    }
    if (p2Socket) {
      const payload = buildStartPayload(p2Color);
      console.log("[MatchmakingHandler] Emitting game:start to P2:", payload);
      p2Socket.emit("game:start", payload);
    }

    console.log(`[MatchmakingHandler] Game ${game.gameId} started: ${player1.playerName} (${p1Color}) vs ${player2.playerName} (${p2Color})`);

  });

  socket.on("queue:leave", ({ queueKey } = {}) => {
    const playerId = socket.data.userId;

    if (queueKey) {
      matchmakingManager.leaveQueue(playerId, queueKey);
      socket.emit("queue:left", { queueKey });
    } else {
      const removedKeys = matchmakingManager.leaveAll(playerId);
      socket.emit("queue:left", { cancelledQueues: removedKeys });
    }
  });
}