import { socket } from "../../../config/socket";

export const emitRejoinGame = (gameId) => {
  socket.emit("game:rejoin", { gameId });
};

export const emitMove = (gameId, from, to, promotion) => {
  socket.emit("game:move", { gameId, from, to, promotion: promotion || undefined });
};

export const emitResign = (gameId) => {
  socket.emit("game:resign", { gameId });
};