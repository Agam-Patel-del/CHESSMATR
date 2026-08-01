import mongoose from "mongoose";

const friendshipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    friendId: {
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

friendshipSchema.index({ userId: 1, friendId: 1 }, { unique: true });

const Friendship = mongoose.model("Friendship", friendshipSchema);

export async function areFriends(id1, id2) {
  const doc = await Friendship.exists({ userId: id1, friendId: id2 });
  return !!doc;
}

export async function getFriendIds(userId, { page, limit } = {}) {
  const strUserId = new mongoose.Types.ObjectId(userId.toString());
  const filter = { userId: strUserId };

  const total = await Friendship.countDocuments(filter);
  let query = Friendship.find(filter).select("friendId").lean();

  if (page && limit) {
    const skip = (page - 1) * limit;
    query = query.sort({ createdAt: -1 }).skip(skip).limit(limit);
  }

  const docs = await query;
  const friendIds = docs.map((doc) => doc.friendId);
  return { friendIds, total };
}

export async function createFriendship(id1, id2) {
  const now = new Date();
  const ops = [
    {
      updateOne: {
        filter: { userId: id1, friendId: id2 },
        update: { $setOnInsert: { userId: id1, friendId: id2, createdAt: now } },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { userId: id2, friendId: id1 },
        update: { $setOnInsert: { userId: id2, friendId: id1, createdAt: now } },
        upsert: true,
      },
    },
  ];
  const result = await Friendship.bulkWrite(ops, { ordered: false });
  return { created: result.upsertedCount > 0 };
}

export async function removeFriendship(id1, id2) {
  const result = await Friendship.deleteMany({
    $or: [
      { userId: id1, friendId: id2 },
      { userId: id2, friendId: id1 },
    ],
  });
  return { removed: result.deletedCount > 0 };
}

export default Friendship;