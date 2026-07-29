import { gameManager } from "./GameManager.js";
import { broadcastPresenceToFriends } from "../socket/presenceHandler.js";

const CLOCK_SYNC_INTERVAL = 1000;
const DISCONNECT_GRACE_PERIOD = 60000;
const START_DELAY_MS = 3000;

class TimerManager {
  constructor() {
    this.gameTimers = new Map(); // gameId => interval ID
    this.startDelayTimers = new Map(); // gameId => timeout ID
    this.disconnectTimers = new Map(); // key(`${gameId}_${playerId}`) => timeout ID
  }

  startGameClock(gameId, game, io) {
    if (this.gameTimers.has(gameId)) return;

    game.startDelayEndsAt = Date.now() + START_DELAY_MS;
    game.clocks.white.lastTickAt = null;

    const startTimeout = setTimeout(() => {
      this.startDelayTimers.delete(gameId);
      delete game.startDelayEndsAt;
      if (game.status === "active") {
        game.clocks.white.lastTickAt = Date.now();
        io.to(gameId).emit("game:clock_sync", this.getCurrentClocks(game));
      }
    }, START_DELAY_MS);

    this.startDelayTimers.set(gameId, startTimeout);

    const interval = setInterval(() => {
      if (game.status !== "active") {
        this.stopGameClock(gameId);
        return;
      }

      const turn = game.chess.turn();
      const activeColor = turn === "w" ? "white" : "black";
      const activeClock = game.clocks[activeColor];

      if (activeClock.lastTickAt === null) {
        io.to(gameId).emit("game:clock_sync", this.getCurrentClocks(game));
        return;
      }

      const now = Date.now();
      const elapsed = now - activeClock.lastTickAt;
      const remaining = activeClock.remaining - elapsed;

      if (remaining <= 0) {
        activeClock.remaining = 0;
        activeClock.lastTickAt = null;
        this.stopGameClock(gameId);

        const winner = activeColor === "white" ? "black" : "white";
        gameManager.endGame(gameId, { winner, reason: "timeout" });

        const p1Id = game.players.white.playerId;
        const p2Id = game.players.black.playerId;
        broadcastPresenceToFriends(io, p1Id, "online");
        broadcastPresenceToFriends(io, p2Id, "online");

        io.to(gameId).emit("game:over", { winner, reason: "timeout" });
        return;
      }

      activeClock.remaining = remaining;
      activeClock.lastTickAt = now;

      io.to(gameId).emit("game:clock_sync", this.getCurrentClocks(game));
    }, CLOCK_SYNC_INTERVAL);

    this.gameTimers.set(gameId, interval);
  }

  stopGameClock(gameId) {
    const interval = this.gameTimers.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.gameTimers.delete(gameId);
    }
    const startTimeout = this.startDelayTimers.get(gameId);
    if (startTimeout) {
      clearTimeout(startTimeout);
      this.startDelayTimers.delete(gameId);
    }
  }

  onMoveMade(game) {
    const now = Date.now();
    const nextTurn = game.chess.turn();
    const justMoved = nextTurn === "w" ? "black" : "white";

    const movedClock = game.clocks[justMoved];
    const nextClock = game.clocks[nextTurn === "w" ? "white" : "black"];

    if (movedClock.lastTickAt !== null) {
      const elapsed = now - movedClock.lastTickAt;
      movedClock.remaining = Math.max(0, movedClock.remaining - elapsed);
    }
    movedClock.remaining += game.timeControl.increment;
    movedClock.lastTickAt = null;
    nextClock.lastTickAt = now;
    return this.getCurrentClocks(game);
  }

  getCurrentClocks(game) {
    const now = Date.now();

    const calc = (clock) => {
      if (clock.lastTickAt === null) return clock.remaining;
      return Math.max(0, clock.remaining - (now - clock.lastTickAt));
    };

    return {
      white: calc(game.clocks.white),
      black: calc(game.clocks.black),
    };
  }

  startDisconnectTimer(gameId, playerId, onExpire) {
    const key = `${gameId}_${playerId}`;
    this.clearDisconnectTimer(gameId, playerId);

    const timeout = setTimeout(() => {
      this.disconnectTimers.delete(key);
      onExpire();
    }, DISCONNECT_GRACE_PERIOD);

    this.disconnectTimers.set(key, timeout);
    console.log(`[Timer] Grace period started for ${playerId} in game ${gameId} (60s)`);
  }

  clearDisconnectTimer(gameId, playerId) {
    const key = `${gameId}_${playerId}`;
    const timeout = this.disconnectTimers.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.disconnectTimers.delete(key);
    }
  }

  clearAllGameTimers(gameId) {
    this.stopGameClock(gameId);
    for (const [key, timeout] of this.disconnectTimers) {
      if (key.startsWith(`${gameId}_`)) {
        clearTimeout(timeout);
        this.disconnectTimers.delete(key);
      }
    }
  }
}


export const timerManager = new TimerManager();