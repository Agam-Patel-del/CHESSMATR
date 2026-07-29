import express from "express";
import mongoose from "mongoose";
import { User, toPublicProfile } from "../models/index.js";
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

    const targetUser = await User.findById(targetUserId).select("friends friendRequests.sender").lean();
    if (!targetUser) {
      return res.status(404).json({ success: false, error: "Target user not found" });
    }

    const isAlreadyFriend = (targetUser.friends || []).some(
      (friendId) => friendId.toString() === currentUserId
    );
    if (isAlreadyFriend) {
      return res.status(400).json({ success: false, error: "User is already in your friends list" });
    }

    const isAlreadyRequested = (targetUser.friendRequests || []).some(
      (reqItem) => reqItem.sender && reqItem.sender.toString() === currentUserId
    );
    if (isAlreadyRequested) {
      return res.status(400).json({ success: false, error: "Friend request already sent" });
    }

    await User.findByIdAndUpdate(targetUserId, {
      $push: { friendRequests: { sender: currentUserId, createdAt: new Date() } },
    });

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

    if (action === "accept") {
      const updatedUser = await User.findOneAndUpdate(
        { _id: currentUserId, "friendRequests.sender": senderId },
        {
          $addToSet: { friends: senderId },
          $pull: { friendRequests: { sender: senderId } },
        }
      );

      if (!updatedUser) {
        return res.status(404).json({ success: false, error: "Friend request not found" });
      }

      await User.findByIdAndUpdate(senderId, {
        $addToSet: { friends: currentUserId },
      });

      return res.status(200).json({
        success: true,
        message: "Friend request accepted",
      });
    } else {
      const updatedUser = await User.findOneAndUpdate(
        { _id: currentUserId, "friendRequests.sender": senderId },
        {
          $pull: { friendRequests: { sender: senderId } },
        }
      );

      if (!updatedUser) {
        return res.status(404).json({ success: false, error: "Friend request not found" });
      }

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

    const user = await User.findById(currentUserId)
      .select("friends")
      .populate("friends", "username stats")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const friends = (user.friends || []).map(toPublicProfile);

    return res.status(200).json({
      success: true,
      friends,
    });
  } catch (err) {
    console.error(`[Friends] Get friends error: ${err}`);
    return res.status(500).json({ success: false, error: "Failed to fetch friends list" });
  }
});

router.get("/requests", async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const user = await User.findById(currentUserId)
      .select({ friendRequests: { $slice: -15 } })
      .populate("friendRequests.sender", "username stats")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const pendingRequests = (user.friendRequests || [])
      .filter((reqItem) => reqItem.sender)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((reqItem) => ({
        sender: toPublicProfile(reqItem.sender),
        createdAt: reqItem.createdAt,
      }));

    return res.status(200).json({
      success: true,
      pendingRequests,
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
    await Promise.all([
      User.findByIdAndUpdate(currentUserId, { $pull: { friends: friendId } }),
      User.findByIdAndUpdate(friendId, { $pull: { friends: currentUserId } }),
    ]);

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