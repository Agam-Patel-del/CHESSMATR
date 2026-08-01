import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

friendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
friendRequestSchema.index({ receiver: 1 });

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);

export async function hasPendingRequest(senderId, receiverId) {
  const doc = await FriendRequest.exists({
    sender: senderId,
    receiver: receiverId,
  });
  return !!doc;
}

export async function createRequest(senderId, receiverId) {
  const result = await FriendRequest.findOneAndUpdate(
    { sender: senderId, receiver: receiverId },
    {
      $set: {
        createdAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );
  return result;
}

export async function respondToRequest(receiverId, senderId) {
  return FriendRequest.findOneAndDelete({
    sender: senderId,
    receiver: receiverId,
  });
}

export async function getPendingReceived(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const filter = { receiver: userId };

  const [docs, total] = await Promise.all([
    FriendRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("sender", "username stats").lean(),
    FriendRequest.countDocuments(filter),
  ]);

  return { requests: docs, total };
}

export async function getPendingSent(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const filter = { sender: userId };

  const [docs, total] = await Promise.all([
    FriendRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("receiver", "username stats").lean(),
    FriendRequest.countDocuments(filter),
  ]);

  return { requests: docs, total };
}

export default FriendRequest;