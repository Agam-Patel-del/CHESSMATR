import { presenceManager } from "../services/presenceManager.js";
import { User } from "../models/index.js";

export function registerPresenceHandlers(socket, io) {
  const userId = socket.data.userId;

  socket.on("presence:get_friends_status", async () => {
    try {
      if (!userId) return;
      const user = await User.findById(userId).select("friends").lean();
      if (!user || !user.friends || user.friends.length === 0) {
        return socket.emit("presence:initial_status", {});
      }

      const friendsStatus = presenceManager.getFriendsStatus(user.friends);
      socket.emit("presence:initial_status", friendsStatus);
    } catch (err) {
      console.error("[Presence Error]", err);
    }
  });
}

export async function broadcastPresenceToFriends(io, userId, status) {
  try {
    if (!io || !userId) return;
    const user = await User.findById(userId).select("friends").lean();
    if (!user || !user.friends || user.friends.length === 0) return;

    const friendSocketIds = presenceManager.getSocketIdsForUsers(user.friends);
    for (const socketId of friendSocketIds) {
      io.to(socketId).emit("presence:update", { userId: userId.toString(), status });
    }
  } catch (err) {
    console.error("[Presence Broadcast Error]", err);
  }
}