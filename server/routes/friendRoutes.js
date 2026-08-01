import express from "express";
import mongoose from "mongoose";
import {
  User,Friendship, toPublicProfile, areFriends, getFriendIds, createFriendship, removeFriendship, hasPendingRequest, createRequest, respondToRequest, getPendingReceived, getPendingSent
} from "../models/index.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware);

router.post("/request/:targetUserId", async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, error: "Invalid target user ID" });
    }
    if (targetUserId === currentUserId) {
      return res.status(400).json({ success: false, error: "You cannot add yourself as a friend" });
    }

    const targetUser = await User.exists({ _id: targetUserId });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: "Target user not found" });
    }

    const isAlreadyFriend = await areFriends(currentUserId, targetUserId);
    if (isAlreadyFriend) {
      return res.status(400).json({ success: false, error: "User is already in your friends list" });
    }

    const [alreadySent, alreadyReceived] = await Promise.all([
      hasPendingRequest(currentUserId, targetUserId),
      hasPendingRequest(targetUserId, currentUserId),
    ]);

    if (alreadySent) {
      return res.status(400).json({ success: false, error: "Friend request already sent" });
    }
    if (alreadyReceived) {
      return res.status(400).json({
        success: false,
        error: "This user has already sent you a friend request",
      });
    }

    await createRequest(currentUserId, targetUserId);
    return res.status(200).json({
      success: true,
      message: "Friend request sent successfully",
    });
  } catch (err) {
    console.error(`[Friends] Send request error: ${err}`);
    return res.status(500).json({ success: false, error: "Failed to send friend request" });
  }
});

router.post("/respond", async (req, res) => {
  try {
    const { senderId, action } = req.body;
    const currentUserId = req.user.id;

    if (!senderId || !mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({ success: false, error: "Invalid sender ID" });
    }
    if (!action || !["accept", "decline"].includes(action)) {
      return res.status(400).json({ success: false, error: "Action must be 'accept' or 'decline'" });
    }

    const updatedRequest = await respondToRequest(currentUserId, senderId);

    if (!updatedRequest) {
      return res.status(404).json({ success: false, error: "Friend request not found" });
    }

    if (action === "accept") {
      await createFriendship(currentUserId, senderId);

      return res.status(200).json({
        success: true,
        message: "Friend request accepted",
      });
    } else {
      return res.status(200).json({
        success: true,
        message: "Friend request declined",
      });
    }
  } catch (err) {
    console.error(`[Friends] Respond error: ${err}`);
    return res.status(500).json({ success: false, error: "Failed to respond to friend request" });
  }
});

router.get("/", async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const { friendIds, total } = await getFriendIds(currentUserId, { page, limit });
    const friendUsers = await User.find({ _id: { $in: friendIds } }).select("username stats createdAt").lean();

    const friends = friendUsers.map(toPublicProfile);
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      friends,
      totalPages,
      currentPage: page,
      totalFriends: total,
    });
  } catch (err) {
    console.error(`[Friends] Get friends error: ${err}`);
    return res.status(500).json({ success: false, error: "Failed to fetch friends list" });
  }
});

router.get("/requests", async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const { requests, total } = await getPendingReceived(currentUserId, { page, limit });

    const pendingRequests = requests
      .filter((reqItem) => reqItem.sender)
      .map((reqItem) => ({
        sender: toPublicProfile(reqItem.sender),
        createdAt: reqItem.createdAt,
      }));

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      pendingRequests,
      totalPages,
      currentPage: page,
      totalRequests: total,
    });
  } catch (err) {
    console.error(`[Friends] Get pending requests error: ${err}`);
    return res.status(500).json({ success: false, error: "Failed to fetch pending requests" });
  }
});

router.delete("/:friendId", async (req, res) => {
  try {
    const { friendId } = req.params;
    const currentUserId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ success: false, error: "Invalid friend ID" });
    }
    await removeFriendship(currentUserId, friendId);

    return res.status(200).json({
      success: true,
      message: "Friend removed successfully",
    });
  } catch (err) {
    console.error(`[Friends] Remove friend error: ${err}`);
    return res.status(500).json({ success: false, error: "Failed to remove friend" });
  }
});

export default router;