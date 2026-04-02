import { useState } from "react";
import {Chess} from "chess.js"
import { calculatePoints } from "../utils/gameHelpers.js";


export const useChess = () => {
  const [game,setGame] = useState(new Chess());
  const [fen,setFEN] = useState(game.fen());

  const makeMove = (move) => {
    try {
      const gameCopy = new Chess(game.fen());
      const res = gameCopy.move(move);
      
      if(res===null){
        console.log("❌ INVALID MOVE ");
        return false;
      }

      setGame(gameCopy);
      setFEN(gameCopy.fen());

      return true;
    }
    catch (error) {
      console.log(error);
      return false;
    }
  }

  const resetGame = () => {
    const tempGame = new Chess();
    setGame(tempGame);
    setFEN(tempGame.fen());
  }

  const getGameStatus = () => {
    return {
      isDraw: game.isDraw(),
      isCheckmate: game.isCheckmate(),
      isStalemate: game.isStalemate(),
      isGameOver: game.isOver(),
      turn: game.turn()
    }
  }

  const getGameStats = () => {
    return calculatePoints(game);
  }
  
  return {
    fen,
    makeMove,
    resetGame,
    getGameStatus,
    getGameStats
  }
}