import { useState } from "react";
import { Chess } from "chess.js"
import { calculatePoints } from "../utils/gameHelpers.js";
import { create } from "zustand";
import { devtools } from 'zustand/middleware'

const chess = new Chess();

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

const initialFen = chess.fen();

const useGameStore = create(
  devtools(
    (set) => ({
      fen:initialFen,
      status:deriveStatus(chess),
      moves:[],

      gameId:null,
      myColor:null,
      players:null,

      makeMove: (move) => {
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
        chess.reset()
        set({
          fen:chess.fen(),
          status:deriveStatus(chess),
          moves:[]
        } , false , 'resetGame')
      },

      applyRemoteMove: (move) => {
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
        chess.load(snapshot.fen);
        set({
          fen:snapshot.fen,
          status:deriveStatus(chess),
          moves:snapshot.moves,
          gameId:snapshot.gameId,
          myColor:snapshot.myColor,
          players:snapshot.players,
        } , false , 'loadGame')
      },

      resignGame: () => {
        set( (state) => ({
          status: {...state.status , isGameOver:true , resigned: true}
        }) , false , 'resignGame')
      },

      setGameId: (id) => set({gameId:id} , false , 'setGameId'),
      setMyColor:(color)=> set({myColor:color}, false ,'setMyColor'),
      setPlayers: (players) => set({players} , false , 'setPlayers'),
    }),
    {name: 'GameStore'}
  )
)

export const useChess = () => {
  const fen = useGameStore((s) => s.fen)
  const moves = useGameStore((s) => s.moves)
  const makeMove = useGameStore((s) => s.makeMove)
  const resetGame = useGameStore((s) => s.resetGame)
  const getGameStatus = () => useGameStore.getState().status
  const getGameStats = () => calculatePoints(chess)

  return {

    fen,
    moves,
    makeMove,
    resetGame,
    getGameStatus,
    getGameStats
  }
};

export {useGameStore , chess}