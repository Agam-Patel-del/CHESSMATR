import mongoose from "mongoose";

export const generateGameId = () => {
  return new mongoose.Types.ObjectId().toString();
};