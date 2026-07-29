import { gameManager } from "./GameManager.js";

class PresenceManager {
  constructor() {
    this.userSockets = new Map(); // userID => set of socket ID
  }

  addSocket(userId, socketId) {
    if (!userId) return false;
    const strUserId = userId.toString();

    if (!this.userSockets.has(strUserId)) {
      this.userSockets.set(strUserId, new Set());
    }

    const isFirstTab = this.userSockets.get(strUserId).size === 0;
    this.userSockets.get(strUserId).add(socketId);
    return isFirstTab;
  }

  removeSocket(userId, socketId) {
    if (!userId) return false;
    const strUserId = userId.toString();

    if (!this.userSockets.has(strUserId)) return false;
    const sockets = this.userSockets.get(strUserId);
    sockets.delete(socketId);

    if (sockets.size === 0) {
      this.userSockets.delete(strUserId);
      return true;
    }
    return false;
  }

  getStatus(userId) {
    if (!userId) return "offline";
    const strUserId = userId.toString();

    if (!this.userSockets.has(strUserId) || this.userSockets.get(strUserId).size === 0) {
      return "offline";
    }
    if (gameManager.isPlayerInActiveGame(strUserId)) {
      return "in_game";
    }
    return "online";
  }

  getSocketIdsForUsers(userIds) {
    if (!Array.isArray(userIds)) return [];

    const targetSocketIds = [];
    for (const userId of userIds) {
      if (!userId) continue;
      const strId = userId._id ? userId._id.toString() : userId.toString();
      const userSocketsSet = this.userSockets.get(strId);
      if (userSocketsSet) {
        targetSocketIds.push(...Array.from(userSocketsSet));
      }
    }
    return targetSocketIds;
  }

  getSocketIdsforUser(userId) {
    if (!userId) return [];
    const strId = userId._id ? userId._id.toString() : userId.toString();
    const userSocketsSet = this.userSockets.get(strId);
    return userSocketsSet ? Array.from(userSocketsSet) : [];
  }

  getFriendsStatus(friendIds) {
    if (!Array.isArray(friendIds)) return {};

    const statusMap = {};
    for (const friendId of friendIds) {
      if (!friendId) continue;
      const strId = friendId._id ? friendId._id.toString() : friendId.toString();
      statusMap[strId] = this.getStatus(strId);
    }
    return statusMap;
  }
}

export const presenceManager = new PresenceManager();