import React from 'react'
import {Chessboard} from "react-chessboard"
import { useChess } from '../hooks/useChess';

function ChessBoard() {
  const {fen , makeMove} = useChess();

  const onDrop = ({sourceSquare,targetSquare}) => {
    const res = makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q", //temp
    });

    console.log(res);
    return res;
  } 

  return (
    <div style={{width:"500px"}}>
      <Chessboard
        options={{
          position: fen,
          onPieceDrop: onDrop,
        }}
      />
    </div>
  )
}

export default ChessBoard;