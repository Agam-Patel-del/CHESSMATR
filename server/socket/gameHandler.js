import { gameManager } from "../services/GameManager.js";
import { timerManager } from "../services/TimerManager.js";
import { broadcastPresenceToFriends } from "./presenceHandler.js";

function handleGameEndPresence(io, game) {
  if (!game || !game.players) return;
  const player1Id = game.players.white.playerId;
  const player2Id = game.players.black.playerId;
  broadcastPresenceToFriends(io, player1Id, "online");
  broadcastPresenceToFriends(io, player2Id, "online");
}

function handleGameStartPresence(io, game) {
  if (!game || !game.players) return;
  const player1Id = game.players.white.playerId;
  const player2Id = game.players.black.playerId;
  broadcastPresenceToFriends(io, player1Id, "in_game");
  broadcastPresenceToFriends(io, player2Id, "in_game");
}

export function registerGameHandlers(socket, io) {
  socket.on("game:move", ({ gameId, from, to, promotion } = {}) => {
    const game = gameManager.getGame(gameId);
    if (!game) {
      return socket.emit("game:error", { message: "Game not found" });
    }
    if (game.status !== "active") {
      return socket.emit("game:error", { message: "Game is already over" });
    }
    if (game.startDelayEndsAt && Date.now() < game.startDelayEndsAt) {
      return socket.emit("game:move_error", { message: "Match starting... moves locked for 3 seconds" });
    }

    const playerInfo = gameManager.getPlayerBySocketId(game, socket.id);
    if (!playerInfo) {
      return socket.emit("game:error", { message: "You are not a participant in this game" });
    }

    const { color } = playerInfo;
    const colorInitial = color === "white" ? "w" : "b";

    if (game.chess.turn() !== colorInitial) {
      return socket.emit("game:move_error", { message: "Not your turn" });
    }

    let moveResult;
    try {
      moveResult = game.chess.move({ from, to, promotion: promotion || undefined });
    } catch {
      moveResult = null;
    }

    if (!moveResult) {
      return socket.emit("game:move_error", { message: "Illegal move" });
    }

    const clocks = timerManager.onMoveMade(game);

    game.moves.push({
      san: moveResult.san,
      from: moveResult.from,
      to: moveResult.to,
      fen: game.chess.fen(),
      capturedPiece: moveResult.captured || null,
      timestamp: Date.now(),
      clocks: { white: clocks.white, black: clocks.black },
    });
    const chess = game.chess;

    io.to(gameId).emit("game:moved", {
      san: moveResult.san,
      from: moveResult.from,
      to: moveResult.to,
      fen: chess.fen(),
      turn: chess.turn(),
      clocks,
      moveNumber: game.moves.length,
    });

    if (chess.isGameOver()) {
      let winner, reason;

      if (chess.isCheckmate()) {
        winner = color;
        reason = "checkmate";
      } else if (chess.isStalemate()) {
        winner = "draw";
        reason = "stalemate";
      } else if (chess.isThreefoldRepetition()) {
        winner = "draw";
        reason = "threefold_repetition";
      } else if (chess.isInsufficientMaterial()) {
        winner = "draw";
        reason = "insufficient_material";
      } else if (chess.isDraw()) {
        winner = "draw";
        reason = "fifty_move_rule";
      } else {
        winner = "draw";
        reason = "draw";
      }

      gameManager.endGame(gameId, { winner, reason });
      timerManager.stopGameClock(gameId);
      handleGameEndPresence(io, game);

      io.to(gameId).emit("game:over", { winner, reason });
      console.log(`[Game] ${gameId} ended: ${winner} by ${reason}`);
      return;
    }
  });

  socket.on("game:resign", ({ gameId } = {}) => {
    const game = gameManager.getGame(gameId);
    if (!game) {
      return socket.emit("game:error", { message: "Game not found" });
    }
    if (game.status !== "active") {
      return socket.emit("game:error", { message: "Game is already over" });
    }
    if (game.startDelayEndsAt && Date.now() < game.startDelayEndsAt) {
      return socket.emit("game:move_error", { message: "Match starting... moves locked for 3 seconds" });
    }

    const playerInfo = gameManager.getPlayerBySocketId(game, socket.id);
    if (!playerInfo) {
      return socket.emit("game:error", { message: "You are not a participant in this game" });
    }

    const winner = playerInfo.color === "white" ? "black" : "white";
    gameManager.endGame(gameId, { winner, reason: "resignation" });
    timerManager.stopGameClock(gameId);
    handleGameEndPresence(io, game);

    io.to(gameId).emit("game:over", { winner, reason: "resignation" });
    console.log(`[Game] ${gameId} ended: ${winner} by resignation`);
  });

  socket.on("game:rejoin", ({ gameId } = {}) => {
    const game = gameManager.getGame(gameId);
    if (!game) {
      return socket.emit("game:error", { message: "Game not found" });
    }

    const playerName = socket.data.username;
    const playerInfo = gameManager.getPlayerByPlayerName(game, playerName);
    if (!playerInfo) {
      console.log(`${playerName} is not a participant in the game : ${gameId}`);
      return socket.emit("game:error", { message: "You are not a participant in this game" });
    }
    const { color, player } = playerInfo;

    const oldSocketId = player.socketId;
    gameManager.updateSocketId(oldSocketId, socket.id, gameId);
    player.online = true;
    socket.join(gameId);

    timerManager.clearDisconnectTimer(gameId, player.playerId);
    socket.emit("game:state", gameManager.buildSnapshot(game, color));
    socket.to(gameId).emit("game:opponent_reconnected");
    console.log(`[Game] ${playerName} rejoined game ${gameId} as ${color}`);
  });

  socket.on("game:rematch_request", ({ gameId } = {}) => {
    const game = gameManager.getGame(gameId);
    if (!game) {
      return socket.emit("game:error", { message: "Game not found" });
    }
    if (game.status !== "finished") {
      return socket.emit("game:error", { message: "Game is not over yet" });
    }
    if (game.startDelayEndsAt && Date.now() < game.startDelayEndsAt) {
      return socket.emit("game:move_error", { message: "Match starting... moves locked for 3 seconds" });
    }

    const playerInfo = gameManager.getPlayerBySocketId(game, socket.id);
    if (!playerInfo) {
      return socket.emit("game:error", { message: "You are not a participant in this game" });
    }

    const { color } = playerInfo;
    game.rematchRequests = game.rematchRequests || { white: false, black: false };
    game.rematchRequests[color] = true;

    socket.to(gameId).emit("game:rematch_requested", { requester: color, gameId });
    console.log(`[Rematch] Player ${color} requested rematch in game ${gameId}`);
  });

  socket.on("game:rematch_decline", ({ gameId } = {}) => {
    const game = gameManager.getGame(gameId);
    if (!game) {
      return socket.emit("game:error", { message: "Game not found" });
    }
    if (game.status !== "finished") {
      return socket.emit("game:error", { message: "Game is not over yet" });
    }

    const playerInfo = gameManager.getPlayerBySocketId(game, socket.id);
    if (!playerInfo) {
      return socket.emit("game:error", { message: "You are not a participant in this game" });
    }

    const { color } = playerInfo;
    if (game.rematchRequests) {
      game.rematchRequests = null;
    }

    socket.to(gameId).emit("game:rematch_declined", { decliner: color, gameId });
    console.log(`[Rematch] Player ${color} declined rematch in game ${gameId}`);
  });

  socket.on("game:rematch_accept", ({ gameId } = {}) => {
    const game = gameManager.getGame(gameId);
    if (!game) {
      return socket.emit("game:error", { message: "Game not found" });
    }
    if (game.status !== "finished") {
      return socket.emit("game:error", { message: "Game is not over yet" });
    }
    if (game.startDelayEndsAt && Date.now() < game.startDelayEndsAt) {
      return socket.emit("game:move_error", { message: "Match starting... moves locked for 3 seconds" });
    }

    const playerInfo = gameManager.getPlayerBySocketId(game, socket.id);
    if (!playerInfo) {
      return socket.emit("game:error", { message: "You are not a participant in this game" });
    }

    const { color } = playerInfo;
    game.rematchRequests = game.rematchRequests || { white: false, black: false };
    game.rematchRequests[color] = true;

    if (game.rematchRequests.white && game.rematchRequests.black) {
      const newGame = gameManager.createRematchGame(game);
      handleGameStartPresence(io, newGame);
      const whiteSocket = io.sockets.sockets.get(newGame.players.white.socketId);
      const blackSocket = io.sockets.sockets.get(newGame.players.black.socketId);

      if (whiteSocket) {
        whiteSocket.leave(gameId);
        whiteSocket.join(newGame.gameId);
      }
      if (blackSocket) {
        blackSocket.leave(gameId);
        blackSocket.join(newGame.gameId);
      }

      timerManager.startGameClock(newGame.gameId, newGame, io);
      io.to(newGame.gameId).emit("game:rematch_start", { gameId: newGame.gameId });
      if (whiteSocket) {
        whiteSocket.emit("game:state", gameManager.buildSnapshot(newGame, "white"));
      }
      if (blackSocket) {
        blackSocket.emit("game:state", gameManager.buildSnapshot(newGame, "black"));
      }
      gameManager.removeGame(gameId);
      console.log(`[Rematch] New game ${newGame.gameId} created from ${gameId} with swapped colors`);
    }
  });

  socket.on("game:draw_offer", ({ gameId } = {}) => {
    const game = gameManager.getGame(gameId);
    if (!game) {
      return socket.emit("game:error", { message: "Game not found" });
    }
    if (game.status !== "active") {
      return socket.emit("game:error", { message: "Game is already over" });
    }
    if (game.startDelayEndsAt && Date.now() < game.startDelayEndsAt) {
      return socket.emit("game:move_error", { message: "Match starting... moves locked for 3 seconds" });
    }

    const playerInfo = gameManager.getPlayerBySocketId(game, socket.id);
    if (!playerInfo) {
      return socket.emit("game:error", { message: "You are not a participant in this game" });
    }

    const { color } = playerInfo;
    game.pendingDrawOfferFrom = color;

    socket.to(gameId).emit("game:draw_offered", { offererColor: color, gameId });
    console.log(`[Draw] Player ${color} offered draw in game ${gameId}`);
  });

  socket.on("game:draw_accept", ({ gameId } = {}) => {
    const game = gameManager.getGame(gameId);
    if (!game) {
      return socket.emit("game:error", { message: "Game not found" });
    }
    if (game.status !== "active") {
      return socket.emit("game:error", { message: "Game is not over yet" });
    }
    if (game.startDelayEndsAt && Date.now() < game.startDelayEndsAt) {
      return socket.emit("game:move_error", { message: "Match starting... moves locked for 3 seconds" });
    }

    const playerInfo = gameManager.getPlayerBySocketId(game, socket.id);
    if (!playerInfo) {
      return socket.emit("game:error", { message: "You are not a participant in this game" });
    }

    const { color } = playerInfo;
    const opponentColor = color === "white" ? "black" : "white";
    if (game.pendingDrawOfferFrom !== opponentColor) {
      return socket.emit("game:error", { message: "No draw offer to accept" });
    }

    game.pendingDrawOfferFrom = null;
    gameManager.endGame(gameId, { winner: "draw", reason: "draw_agreement" });
    timerManager.stopGameClock(gameId);
    handleGameEndPresence(io, game);

    io.to(gameId).emit("game:over", { winner: "draw", reason: "draw_agreement" });
    console.log(`[Draw] Game ${gameId} ended by draw agreement`);
  });

  socket.on("game:draw_decline", ({ gameId } = {}) => {
    const game = gameManager.getGame(gameId);
    if (!game) {
      return socket.emit("game:error", { message: "Game not found" });
    }
    if (game.status !== "active") {
      return socket.emit("game:error", { message: "Game is not over yet" });
    }
    if (game.startDelayEndsAt && Date.now() < game.startDelayEndsAt) {
      return socket.emit("game:move_error", { message: "Match starting... moves locked for 3 seconds" });
    }

    const playerInfo = gameManager.getPlayerBySocketId(game, socket.id);
    if (!playerInfo) {
      return socket.emit("game:error", { message: "You are not a participant in this game" });
    }

    const { color } = playerInfo;
    const opponentColor = color === "white" ? "black" : "white";
    if (game.pendingDrawOfferFrom !== opponentColor) {
      return socket.emit("game:error", { message: "No draw offer to decline" });
    }

    game.pendingDrawOfferFrom = null;

    socket.to(gameId).emit("game:draw_declined", { decliner: color, gameId });
    console.log(`[Draw] Player ${color} declined draw offer in game ${gameId}`);
  });
}