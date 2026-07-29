import { useEffect, useState } from "react";
import { socket } from "../config/socket";

export function usePresence() {
  const [friendsStatus, setFriendsStatus] = useState({}); // { [userId]: 'online' | 'in_game' | 'offline' }

  useEffect(() => {
    if (!socket) return;

    const requestFriendsStatus = () => {
      socket.emit("presence:get_friends_status");
    };
    if (socket.connected) {
      requestFriendsStatus();
    }
    const handleInitialStatus = (initialMap) => {
      setFriendsStatus(initialMap || {});
    };
    const handlePresenceUpdate = ({ userId, status }) => {
      if (!userId) return;
      setFriendsStatus((prev) => ({
        ...prev,
        [userId]: status,
      }));
    };

    socket.on("connect", requestFriendsStatus);
    socket.on("presence:initial_status", handleInitialStatus);
    socket.on("presence:update", handlePresenceUpdate);

    return () => {
      socket.off("connect", requestFriendsStatus);
      socket.off("presence:initial_status", handleInitialStatus);
      socket.off("presence:update", handlePresenceUpdate);
    };
  }, []);

  return friendsStatus;
}

export default usePresence;