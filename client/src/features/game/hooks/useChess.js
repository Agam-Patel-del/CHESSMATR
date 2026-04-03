import { useState } from "react";
import { Chess } from "chess.js"
import { calculatePoints } from "../utils/gameHelpers.js";
import { create } from "zustand";
import { devtools } from 'zustand/middleware'

// const chess = new Chess();

const deriveStatus = (c) => {
  return {
    isDraw:c.isDraw(),
    isCheckmate:c.isCheckmate(),
    isStalemate:c.isStalemate(),
    isGameOver:c.isGameOver(),
    turn:c.turn(),
    inCheck:c.inCheck(),
  }
}

// const initialFen = chess.fen();

const useGameStore = create(
  devtools(
    (set,get) => {
      const game = new Chess();
      return {
        chess:game,
        fen:game.fen(),
        status:deriveStatus(game),
        moves:[],

        gameId:null,
        myColor:null,
        players:null,

        makeMove: (move) => {
          const chess = get().chess;
          let result=null;
          try{
            result = chess.move(move);
          }
          catch{
            console.log("Invalid move , error making the move")
            return false;
          }
          if(!result){
            console.log("Invalid move , result is null")
            return false;
          }
          const newFen=chess.fen();

          set( (state) => ({
            fen:newFen,
            status:deriveStatus(chess),
            moves:[
              ...state.moves,
              {
                san:result.san,
                uci:result.from+result.to,
                fen:newFen,
                capturedPiece:result.captured ?? null,
                timestamp:Date.now(),
              }
            ],
          }) , false , 'makeMove')

          return true;
        },

        resetGame: () => {
          const newChess = new Chess();

          set({
            chess:newChess,
            fen:newChess.fen(),
            status:deriveStatus(newChess),
            moves:[],
          }, false , 'resetGame');
        },

        applyRemoteMove: (move) => {
          const chess = get().chess;
          try{
            chess.load(move.fen)
          }
          catch{
            console.log("[gamestore] invalid FEN from server" , move.fen)
            return;
          }

          set( (state) => ({
            fen:move.fen,
            status:deriveStatus(chess),
            moves:[...state.moves,move]
          }), false , 'applyRemoteMove')
        },

        loadGame: (snapshot) => {
          const chess = new Chess();
          chess.load(snapshot.fen);
          set({
            chess,
            fen:snapshot.fen,
            status:deriveStatus(chess),
            moves:snapshot.moves,
            gameId:snapshot.gameId,
            myColor:snapshot.myColor,
            players:snapshot.players,
          } , false , 'loadGame')
        },

        resignGame: () => {
          const chess = get().chess;
          set( (state) => ({
            status: {...state.status , isGameOver:true , resigned: true}
          }) , false , 'resignGame')
        },

        updatePlayerTime: (color,timeLeft) => {
          const chess = get().chess;
          set((state) => {
            if(!state.players) return state
            const key = color === 'w' ? 'white' : 'black'
            return{
              players:{
                ...state.players,
                [key]:{ ...state.players[key], timeLeft },
              },
            }
          }, false , 'updatePlayerTime')
        },
        getGameStats: () => {
          const chess = get().chess;
          return calculatePoints(chess);
        },

        setGameId: (id) => set({gameId:id} , false , 'setGameId'),
        setMyColor:(color)=> set({myColor:color}, false ,'setMyColor'),
        setPlayers: (players) => set({players} , false , 'setPlayers'),
      }
      
    },
    { name:'GameStore' }
  )
)

export const useChess = () => {
  const fen = useGameStore((s) => s.fen)
  const moves = useGameStore((s) => s.moves)
  const makeMove = useGameStore((s) => s.makeMove)
  const resetGame = useGameStore((s) => s.resetGame)
  const getGameStatus = () => useGameStore.getState().status
  const getGameStats = () => useGameStore.getState().getGameStats()

  return {

    fen,
    moves,
    makeMove,
    resetGame,
    getGameStatus,
    getGameStats
  }
};

export {useGameStore}