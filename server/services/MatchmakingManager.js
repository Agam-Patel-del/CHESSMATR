import { isValidTimeControl, getQueueKey } from "../utils/timeControls.js";

class MatchmakingManager {
  constructor() {
    this.queues = new Map(); // queueKey -> array of waiting players
    this.playerQueues = new Map(); // playerId -> Set of queueKeys
    this.playerSockets = new Map(); // playerId -> socketId
  }

  join(socketId, playerId, playerName, timeControl) {
    console.log(`[MatchmakingManager] join() called for :`, { socketId, playerId, playerName, timeControl });

    if (!isValidTimeControl(timeControl.base, timeControl.increment)) {
      console.log(`[MatchmakingManager]  Unsupported timeControl: ${timeControl}`);
      return {
        success: false,
        error: `Unsupported time control: ${timeControl.base}+${timeControl.increment}`,
      };
    }

    const queueKey = getQueueKey(timeControl.base, timeControl.increment);
    this.removePlayerFromQueue(playerId, queueKey);
    this.playerSockets.set(playerId, socketId);

    if (!this.queues.has(queueKey)) {
      this.queues.set(queueKey, []);
      console.log(`[MatchmakingManager] Created new queue: ${queueKey}`);
    }

    const entry = {
      socketId,
      playerId,
      playerName,
      timeControl,
      joinedAt: Date.now(),
    };

    this.queues.get(queueKey).push(entry);
    console.log(`[MatchmakingManager] Player: ${playerName} added to queue: ${queueKey}, Queue size: ${this.queues.get(queueKey).length}`);

    if (!this.playerQueues.has(playerId)) {
      this.playerQueues.set(playerId, new Set());
    }
    this.playerQueues.get(playerId).add(queueKey);
    return { success: true, queueKey };
  }

  removePlayerFromQueue(playerId, queueKey) {
    const queue = this.queues.get(queueKey);
    if (queue) {
      const idx = queue.findIndex(p => p.playerId === playerId);
      if (idx !== -1) {
        queue.splice(idx, 1);
        if (queue.length === 0) {
          this.queues.delete(queueKey);
        }
      }
    }

    const playerQueueSet = this.playerQueues.get(playerId);
    if (playerQueueSet) {
      playerQueueSet.delete(queueKey);
      if (playerQueueSet.size === 0) {
        this.playerQueues.delete(playerId);
        this.playerSockets.delete(playerId);
      }
    }
  }

  leaveAll(playerId) {
    const queueKeys = this.playerQueues.get(playerId);
    if (!queueKeys) return [];

    const removedKeys = [...queueKeys];

    for (const queueKey of removedKeys) {
      const queue = this.queues.get(queueKey);
      if (queue) {
        const idx = queue.findIndex(p => p.playerId === playerId);
        if (idx !== -1) {
          queue.splice(idx, 1);
        }
        if (queue.length === 0) {
          this.queues.delete(queueKey);
        }
      }
    }

    this.playerQueues.delete(playerId);
    this.playerSockets.delete(playerId);

    console.log(`[MatchmakingManager] leaveAll() removed playerId ${playerId.substring(0, 8)} from queues: ${removedKeys.join(", ")}`);
    return removedKeys;
  }

  leaveQueue(playerId, queueKey) {
    this.removePlayerFromQueue(playerId, queueKey);
    console.log(`[MatchmakingManager] leaveQueue() removed playerId ${playerId.substring(0, 8)} from queue: ${queueKey}`);
  }

  leave(socketId) {
    for (const [playerId, sid] of this.playerSockets.entries()) {
      if (sid === socketId) {
        return this.leaveAll(playerId);
      }
    }
    return [];
  }

  tryMatch(queueKey) {
    const queue = this.queues.get(queueKey);
    console.log(`[MatchmakingManager] tryMatch() called for: ${queueKey}, Queue size: ${queue?.length || 0}`);

    if (!queue || queue.length < 2) {
      console.log(`[MatchmakingManager] Not enough players to match (need 2, have ${queue?.length || 0})`);
      return null;
    }

    const player1 = queue[0];
    const opponentIdx = queue.findIndex((player, index) => index > 0 && player.playerId !== player1.playerId);

    if (opponentIdx === -1) {
      console.log(`[MatchmakingManager] No opponents with a different playerId found in queue: ${queueKey}`);
      return null;
    }

    const player2 = queue[opponentIdx];
    console.log(`[MatchmakingManager] Match found: ${player1.playerName} vs ${player2.playerName}`);

    const p1AllQueues = this.playerQueues.get(player1.playerId);
    const p2AllQueues = this.playerQueues.get(player2.playerId);
    const p1CancelledQueues = p1AllQueues ? [...p1AllQueues].filter(k => k !== queueKey) : [];
    const p2CancelledQueues = p2AllQueues ? [...p2AllQueues].filter(k => k !== queueKey) : [];

    this.leaveAll(player1.playerId);
    this.leaveAll(player2.playerId);

    return {
      player1,
      player2,
      cancelledQueues: {
        [player1.playerId]: p1CancelledQueues,
        [player2.playerId]: p2CancelledQueues,
      },
    };
  }

  getPlayerQueues(playerId) {
    const queueSet = this.playerQueues.get(playerId);
    return queueSet ? [...queueSet] : [];
  }

  isInAnyQueue(playerId) {
    const queueSet = this.playerQueues.get(playerId);
    return queueSet ? queueSet.size > 0 : false;
  }

  getPlayerSocketId(playerId) {
    return this.playerSockets.get(playerId) || null;
  }
}

export const matchmakingManager = new MatchmakingManager();