import { React, useState } from "react";
import { Chess } from "chess.js";
import { create } from "zustand";
import { soundService } from "../services/soundService";

const deriveStatus = (c) => {
  return {
    isDraw: c.isDraw(),
    isCheckmate: c.isCheckmate(),
    isStalemate: c.isStalemate(),
    isGameOver: c.isGameOver(),
    turn: c.turn(),
    inCheck: c.inCheck(),
  }
}

const useGameStore = create(
  (set, get) => {
    const game = new Chess();
    return {
      chess: game,
      fen: game.fen(),
      status: deriveStatus(game),
      moves: [],

      gameId: null,
      myColor: null,
      players: null,
      opponentOnline: true,
      clocks: { white: 0, black: 0 },

      makeMove: (move) => {
        const chess = get().chess;
        let result = null;
        try {
          result = chess.move(move);
        }
        catch {
          console.log("[makemove] Invalid move , error making the move");
          soundService.playError();
          return false;
        }
        if (!result) {
          console.log("[makemove] Invalid move , result is null");
          soundService.playError();
          return false;
        }
        const newFen = chess.fen();

        if (result.captured) {
          soundService.playCapture();
        } else {
          soundService.playMove();
        }

        set((state) => ({
          fen: newFen,
          status: deriveStatus(chess),
          moves: [
            ...state.moves,
            {
              san: result.san,
              uci: result.from + result.to,
              fen: newFen,
              capturedPiece: result.captured ?? null,
              timestamp: Date.now(),
            }
          ],
        }))
        return true;
      },

      applyRemoteMove: (move) => {
        const chess = get().chess;
        try {
          chess.load(move.fen)
        }
        catch {
          console.log("[gamestore] invalid FEN from server", move.fen)
          return;
        }

        if (move.capturedPiece) {
          soundService.playCapture();
        } else {
          soundService.playMove();
        }

        set((state) => ({
          fen: move.fen,
          status: deriveStatus(chess),
          moves: [...state.moves, move]
        }))
      },

      loadGame: (snapshot) => {
        const chess = new Chess();
        chess.load(snapshot.fen);
        set({
          chess,
          fen: snapshot.fen,
          status: deriveStatus(chess),
          moves: snapshot.moves,
          gameId: snapshot.gameId,
          myColor: snapshot.myColor,
          players: snapshot.players,
        })
      },

      resignGame: () => {
        const chess = get().chess;
        set((state) => ({
          status: { ...state.status, isGameOver: true, resigned: true }
        }))
      },

      updatePlayerTime: (color, timeLeft) => {
        const chess = get().chess;
        set((state) => {
          if (!state.players) return state
          const key = color === "w" ? "white" : "black"
          return {
            players: {
              ...state.players,
              [key]: { ...state.players[key], timeLeft },
            },
          }
        })
      },

      setGameId: (id) => set({ gameId: id }),
      setMyColor: (color) => set({ myColor: color }),
      setPlayers: (players) => set({ players }),
      setOpponentOnline: (online) => set({ opponentOnline: online }),
      setClocks: (clocks) => set({ clocks }),
      setGameResult: (result) => set((state) => ({
        status: { ...state.status, isGameOver: true, result },
      })),

      revertLastMove: () => {
        const chess = get().chess;
        const result = chess.undo();
        if (!result) return;
        set((state) => ({
          fen: chess.fen(),
          status: deriveStatus(chess),
          moves: state.moves.slice(0, -1),
        }));
      },

      fullReset: () => {
        const newChess = new Chess();
        set({
          chess: newChess,
          fen: newChess.fen(),
          status: deriveStatus(newChess),
          moves: [],
          gameId: null,
          myColor: null,
          players: null,
          opponentOnline: true,
          clocks: { white: 0, black: 0 },
        });
      },
    }

  }
)

export const useChess = () => {
  const fen = useGameStore((s) => s.fen)
  const moves = useGameStore((s) => s.moves)
  const status = useGameStore((s) => s.status)
  const makeMove = useGameStore((s) => s.makeMove)
  const opponentOnline = useGameStore((s) => s.opponentOnline)
  const clocks = useGameStore((s) => s.clocks)
  const gameId = useGameStore((s) => s.gameId)
  const myColor = useGameStore((s) => s.myColor)
  const players = useGameStore((s) => s.players)

  return {
    fen,
    moves,
    status,
    makeMove,
    opponentOnline,
    clocks,
    gameId,
    myColor,
    players,
  }
};

export { useGameStore }