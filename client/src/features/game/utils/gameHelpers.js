export function calculateNextMove(gameState) {
  // Game helper utilities
  return null;
}

const pieceValues = {
  p:1,
  n:3,
  b:3,
  r:5,
  q:9,
  k:0
}

export const calculatePoints = (game) => {
  const board = game.board();

  let whitePoints=0,blackPoints=0;

  for(let row of board){
    for(let square of row){
      if(square){
        const val = pieceValues[square.type];

        if(square.color === "w"){
          whitePoints+=val;
        }
        else{
          blackPoints+=val;
        }
      }
    }
  }

  return {
    whitePoints,
    blackPoints,
    differencePoints : whitePoints - blackPoints
  }
}