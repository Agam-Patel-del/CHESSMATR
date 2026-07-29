import { Chess } from "chess.js";
import { generateGameId } from "../utils/generateId.js";
import { getTimeControlMs } from "../utils/timeControls.js";

class GameManager {
  constructor() {
    this.games = new Map(); // gameId =>gameObejct
    this.socketIndex = new Map(); // socketId => gameId
    this.playerIndex = new Map(); // playerId => gameId (active games only)
  }

  createGame(player1, player2, timeControl) {
    const gameId = generateGameId();
    const { baseMs, incrementMs } = getTimeControlMs(timeControl.base, timeControl.increment);

    const whitePlayer = Math.random() < 0.5 ? player1 : player2;
    const blackPlayer = whitePlayer === player1 ? player2 : player1;

    const game = {
      gameId,
      chess: new Chess(),
      players: {
        white: {
          socketId: whitePlayer.socketId,
          playerId: whitePlayer.playerId,
          playerName: whitePlayer.playerName,
          online: true,
        },
        black: {
          socketId: blackPlayer.socketId,
          playerId: blackPlayer.playerId,
          playerName: blackPlayer.playerName,
          online: true,
        },
      },
      timeControl: { base: baseMs, increment: incrementMs },
      clocks: {
        white: { remaining: baseMs, lastTickAt: null },
        black: { remaining: baseMs, lastTickAt: null },
      },
      moves: [],
      status: "active",
      result: null,
      createdAt: Date.now(),
    };

    this.games.set(gameId, game);
    this.socketIndex.set(whitePlayer.socketId, gameId);
    this.socketIndex.set(blackPlayer.socketId, gameId);
    this.playerIndex.set(whitePlayer.playerId, gameId);
    this.playerIndex.set(blackPlayer.playerId, gameId);

    return game;
  }

  getGame(gameId) {
    if (!gameId) return null;
    return this.games.get(gameId) || null;
  }

  getGameBySocketId(socketId) {
    if (!socketId) return null;
    const gameId = this.socketIndex.get(socketId) || null;
    return this.games.get(gameId) || null;
  }

  async endGame(gameId, result) {
    const game = this.games.get(gameId);
    if (!game) return;

    game.status = "finished";
    game.result = result;

    this.socketIndex.delete(game.players.white.socketId);
    this.socketIndex.delete(game.players.black.socketId);
    this.playerIndex.delete(game.players.white.playerId);
    this.playerIndex.delete(game.players.black.playerId);

    try {
      const { User, Game } = await import("../models/index.js");

      const whiteId = game.players.white.playerId;
      const blackId = game.players.black.playerId;

      if (result.winner === "draw") {
        await User.updateMany(
          { _id: { $in: [whiteId, blackId] } },
          { $inc: { "stats.draws": 1, "stats.gamesPlayed": 1 } }
        );
      } else {
        const winnerId = result.winner === "white" ? whiteId : blackId;
        const loserId = result.winner === "white" ? blackId : whiteId;

        await Promise.all([
          User.findByIdAndUpdate(winnerId, { $inc: { "stats.wins": 1, "stats.gamesPlayed": 1 } }),
          User.findByIdAndUpdate(loserId, { $inc: { "stats.losses": 1, "stats.gamesPlayed": 1 } }),
        ]);
      }

      await Game.create({
        gameId: game.gameId,
        players: {
          white: whiteId,
          black: blackId,
        },
        result: {
          winner: result.winner,
          reason: result.reason,
        },
        moves: game.moves,
        fen: game.chess.fen(),
        timeControl: {
          base: game.timeControl.base,
          increment: game.timeControl.increment,
        },
      });

      setTimeout(() => {
        console.log(`[GameManager] deleted game : ${gameId} from the game`);
        this.games.delete(gameId);
      }, 5 * 60 * 1000);

      console.log(`[DB] Saved game ${game.gameId} and updated player stats.`);
    } catch (err) {
      console.error(`[DB] Failed to save game / update player stats: ${err}`);
    }
  }

  removeGame(gameId) {
    const game = this.games.get(gameId);
    if (game) {
      this.socketIndex.delete(game.players.white.socketId);
      this.socketIndex.delete(game.players.black.socketId);
      this.playerIndex.delete(game.players.white.playerId);
      this.playerIndex.delete(game.players.black.playerId);
    }
    this.games.delete(gameId);
  }

  updateSocketId(oldSocketId, newSocketId, gameId) {
    const game = this.games.get(gameId);
    if (!game) return;

    this.socketIndex.delete(oldSocketId);
    this.socketIndex.set(newSocketId, gameId);

    for (const color of ["white", "black"]) {
      if (game.players[color].socketId === oldSocketId) {
        game.players[color].socketId = newSocketId;
        break;
      }
    }
  }

  buildSnapshot(game, color) {
    const opponentColor = color === "white" ? "black" : "white";
    const now = Date.now();

    const whiteClock = game.clocks.white.lastTickAt !== null
      ? Math.max(0, game.clocks.white.remaining - (now - game.clocks.white.lastTickAt))
      : game.clocks.white.remaining;

    const blackClock = game.clocks.black.lastTickAt !== null
      ? Math.max(0, game.clocks.black.remaining - (now - game.clocks.black.lastTickAt))
      : game.clocks.black.remaining;

    return {
      gameId: game.gameId,
      fen: game.chess.fen(),
      moves: game.moves,
      myColor: color,
      players: {
        white: {
          id: game.players.white.playerId,
          name: game.players.white.playerName,
          online: game.players.white.online,
        },
        black: {
          id: game.players.black.playerId,
          name: game.players.black.playerName,
          online: game.players.black.online,
        },
      },
      opponent: {
        name: game.players[opponentColor].playerName,
        id: game.players[opponentColor].playerId,
      },
      timeControl: {
        base: game.timeControl.base,
        increment: game.timeControl.increment,
      },
      clocks: {
        white: whiteClock,
        black: blackClock,
      },
      status: game.status,
      result: game.result,
    };
  }

  getPlayerBySocketId(game, socketId) {
    if (game.players.white.socketId === socketId) {
      return { color: "white", player: game.players.white };
    }
    if (game.players.black.socketId === socketId) {
      return { color: "black", player: game.players.black };
    }
    return null;
  }

  getPlayerByPlayerName(game, playerName) {
    if (game.players.white.playerName === playerName) {
      return { color: "white", player: game.players.white };
    }
    if (game.players.black.playerName === playerName) {
      return { color: "black", player: game.players.black };
    }
    return null;
  }

  createRematchGame(oldGame) {
    const gameId = generateGameId();
    const baseMs = oldGame.timeControl.base;
    const incrementMs = oldGame.timeControl.increment;

    const game = {
      gameId,
      chess: new Chess(),
      players: {
        white: {
          socketId: oldGame.players.black.socketId,
          playerId: oldGame.players.black.playerId,
          playerName: oldGame.players.black.playerName,
          online: true,
        },
        black: {
          socketId: oldGame.players.white.socketId,
          playerId: oldGame.players.white.playerId,
          playerName: oldGame.players.white.playerName,
          online: true,
        },
      },
      timeControl: { base: baseMs, increment: incrementMs },
      clocks: {
        white: { remaining: baseMs, lastTickAt: null },
        black: { remaining: baseMs, lastTickAt: null },
      },
      moves: [],
      status: "active",
      result: null,
      createdAt: Date.now(),
    };

    this.games.set(gameId, game);
    this.socketIndex.set(game.players.white.socketId, gameId);
    this.socketIndex.set(game.players.black.socketId, gameId);
    this.playerIndex.set(game.players.white.playerId, gameId);
    this.playerIndex.set(game.players.black.playerId, gameId);

    return game;
  }

  getActiveGameByPlayerId(playerId) {
    const gameId = this.playerIndex.get(playerId);
    if (!gameId) return null;
    const game = this.games.get(gameId);
    if (!game || game.status !== "active") {
      this.playerIndex.delete(playerId);
      return null;
    }
    return game;
  }

  isPlayerInActiveGame(playerId) {
    return this.getActiveGameByPlayerId(playerId) !== null;
  }
}

export const gameManager = new GameManager();