import React, { useState, useEffect, useMemo, useEffectEvent } from "react";
import { Chessboard } from "react-chessboard";
import { useChess, useGameStore } from "../../hooks/useChess";
import { emitMove } from "./services/gameSocket";

const getKingSquare = (chess, color) => {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === "k" && piece.color === color) {
        const col = String.fromCharCode(97 + c);
        const row = 8 - r;
        return `${col}${row}`;
      }
    }
  }
  return null;
};

function ChessBoard() {
  const { fen, makeMove, status } = useChess();
  const myColor = useGameStore((s) => s.myColor);
  const gameId = useGameStore((s) => s.gameId);
  const moves = useGameStore((s) => s.moves);
  const chess = useGameStore.getState().chess;

  const [selectedSquare, setSelectedSquare] = useState(null);
  const [pendingPromotion, setPendingPromotion] = useState(null);

  useEffect(() => {
    setSelectedSquare(null);
  }, [fen]);

  const lastMove = moves[moves.length - 1];
  const lastFrom = lastMove ? lastMove.from || lastMove.uci?.slice(0, 2) : null;
  const lastTo = lastMove ? lastMove.to || lastMove.uci?.slice(2, 4) : null;

  const inCheck = status?.inCheck;
  const kingSquare = useMemo(() => {
    if (!inCheck) {
      return null;
    }
    return getKingSquare(chess, status?.turn);
  }, [inCheck, status?.turn, fen, chess]);

  const legalMovesMap = useMemo(() => {
    if (!selectedSquare) return {};
    try {
      const verboseMoves = chess.moves({
        square: selectedSquare,
        verbose: true,
      });
      const map = {};
      verboseMoves.forEach((m) => {
        map[m.to] = {
          isCapture: !!chess.get(m.to) || m.flags.includes("e"),
        };
      });
      return map;
    } catch (err) {
      console.log(`Chessboard.jsx/legalMovesMap , error:${err}`);
      return {};
    }
  }, [selectedSquare, fen, chess]);

  const isPromotionMove = (from, to) => {
    const piece = chess.get(from);
    if (!piece || piece.type !== "p") return false;
    const isWhitePawn = piece.color === "w" && to[1] === "8";
    const isBlackPawn = piece.color === "b" && to[1] === "1";
    if (!isWhitePawn && !isBlackPawn) return false;
    const legalMoves = chess.moves({ square: from, verbose: true });
    return legalMoves.some((m) => m.to === to && m.flags.includes("p"));
  };

  const handlePromote = (pieceType) => {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    const res = makeMove({
      from,
      to,
      promotion: pieceType,
    });
    if (res) {
      emitMove(gameId, from, to, pieceType);
    }
    setPendingPromotion(null);
    setSelectedSquare(null);
  };

  const onDrop = ({ sourceSquare, targetSquare }) => {
    if (status?.isGameOver) return false;
    if (myColor !== status?.turn) return false;

    if (isPromotionMove(sourceSquare, targetSquare)) {
      setPendingPromotion({ from: sourceSquare, to: targetSquare });
      return false;
    }

    const res = makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    if (res) {
      emitMove(gameId, sourceSquare, targetSquare, "q");
    }
    console.log(res);
    return res;
  };

  const onSquareClick = ({ square }) => {
    const piece = chess.get(square);

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      const isLegal = legalMovesMap[square];
      const selectedPiece = chess.get(selectedSquare);
      const isMyTurn = myColor === status?.turn;
      const isMyPiece = selectedPiece && selectedPiece.color === myColor;

      if (isLegal && isMyTurn && isMyPiece && !status?.isGameOver) {
        if (isPromotionMove(selectedSquare, square)) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }

        const res = makeMove({
          from: selectedSquare,
          to: square,
          promotion: "q",
        });

        if (res) {
          emitMove(gameId, selectedSquare, square, "q");
        }
        setSelectedSquare(null);
        return;
      }

      if (piece && piece.color === myColor) {
        setSelectedSquare(square);
        return;
      }

      setSelectedSquare(null);
      return;
    }

    if (piece && piece.color === myColor) {
      setSelectedSquare(square);
    }
  };

  const canDragPiece = ({ piece }) => {
    if (status?.isGameOver) return false;
    if (myColor !== status?.turn) return false;
    const pieceStr = typeof piece === "string" ? piece : piece?.pieceType || "";
    return pieceStr !== "" && pieceStr[0] === myColor;
  };

  const customSquareRenderer = ({ square, children }) => {
    const isSelected = selectedSquare === square;
    const isLastMove = lastFrom === square || lastTo === square;
    const isKingInCheck = kingSquare === square;
    const legalMoveInfo = legalMovesMap[square];

    return (
      <div className="custom-square-wrapper">
        {/* Render highlights below everything else */}
        {isSelected && <div className="square-highlight selected" />}
        {!isSelected && isLastMove && (
          <div className="square-highlight last-move" />
        )}
        {isKingInCheck && <div className="square-highlight check-glow" />}

        {/* Render legal move dot/ring */}
        {legalMoveInfo && (
          <div
            className={`legal-move-indicator ${
              legalMoveInfo.isCapture ? "capture-ring" : "empty-dot"
            }`}
          />
        )}

        {/* Render the draggable piece component itself */}
        {children}
      </div>
    );
  };

  return (
    <div style={{ width: "100%", maxWidth: "500px", position: "relative" }}>
      <Chessboard
        options={{
          position: fen,
          onPieceDrop: onDrop,
          boardOrientation: myColor === "b" ? "black" : "white",
          animationDurationInMs: 200,
          allowDragging: myColor === status?.turn && !status?.isGameOver,
          canDragPiece,
          onSquareClick,
          squareRenderer: customSquareRenderer,
        }}
      />

      {pendingPromotion && (
        <div className="promotion-overlay">
          <div className="promotion-modal">
            <h3>Promote Pawn</h3>
            <div className="promotion-options">
              <button onClick={() => handlePromote("q")}>
                <span className="piece-icon">
                  {myColor === "b" ? "♛" : "♕"}
                </span>
                <span className="piece-label">Queen</span>
              </button>
              <button onClick={() => handlePromote("r")}>
                <span className="piece-icon">
                  {myColor === "b" ? "♜" : "♖"}
                </span>
                <span className="piece-label">Rook</span>
              </button>
              <button onClick={() => handlePromote("b")}>
                <span className="piece-icon">
                  {myColor === "b" ? "♝" : "♗"}
                </span>
                <span className="piece-label">Bishop</span>
              </button>
              <button onClick={() => handlePromote("n")}>
                <span className="piece-icon">
                  {myColor === "b" ? "♞" : "♘"}
                </span>
                <span className="piece-label">Knight</span>
              </button>
            </div>
            <button
              className="promotion-cancel"
              onClick={() => setPendingPromotion(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChessBoard;
