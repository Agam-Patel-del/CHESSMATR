import mongoose from "mongoose";

const gameSchema = new mongoose.Schema(
  {
    gameId: {
      type: String,
      required: true,
      unique: true,
    },
    players: {
      white: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      black: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    },
    result: {
      winner: {
        type: String,
        enum: ["white", "black", "draw"],
        required: true,
      },
      reason: {
        type: String,
        required: true,
      },
    },
    moves: [
      {
        san: String,
        from: String,
        to: String,
        fen: String,
        capturedPiece: String,
        timestamp: Number,
        clocks: {
          white: Number,
          black: Number,
        },
      },
    ],
    fen: {
      type: String,
      required: true,
    },
    timeControl: {
      base: Number,
      increment: Number,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

gameSchema.index({ "players.white": 1, createdAt: -1 });
gameSchema.index({ "players.black": 1, createdAt: -1 });

export default mongoose.model("Game", gameSchema);