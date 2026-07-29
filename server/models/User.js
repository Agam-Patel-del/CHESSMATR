import mongoose, { Mongoose } from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-zA-Z0-9_]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /.+@.+\..+/,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    friendRequests: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    OTP: {
      type: String,
    },
    OTPExpires: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    verificationAttempts: {
      type: Number,
      default: 0,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    stats: {
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      draws: { type: Number, default: 0 },
      gamesPlayed: { type: Number, default: 0 },
    },
  },
  { timestamps: false }
);

export function toPublicProfile(user) {
  if (!user) return null;
  const id = user.id ? user.id : user._id ? user._id.toString() : null;
  if(!id) return null;
  return {
    id,
    username: user.username,
    stats: user.stats || { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 },
    createdAt: user.createdAt,
  };
}

export default mongoose.model("User", userSchema);