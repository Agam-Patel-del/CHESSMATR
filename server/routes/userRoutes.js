import express from "express";
import { User, Game, toPublicProfile } from "../models/index.js";
import mongoose from "mongoose";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/search", authMiddleware, async (req, res) => {
  try {
    const query = req.query.q ? req.query.q.trim() : "";
    if (!query) {
      return res.status(200).json([]);
    }

    const currentUserId = req.user.id;
    const matchingUsers = await User.find({
      _id: { $ne: currentUserId },
      username: { $regex: query, $options: "i" }
    }).select("_id username stats").limit(10).lean();

    const response = matchingUsers.map(toPublicProfile);
    return res.status(200).json(response);
  } catch (err) {
    console.error(`[User] Search users error: ${err}`);
    return res.status(500).json({ error: "Failed to search users" });
  }
});

// to update username 
router.put("/profile/username", authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Username is required" });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      return res.status(400).json({ error: "Username must be between 3 and 20 characters" });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return res.status(400).json({ error: "Username can only contain letters, numbers, and underscores" });
    }

    const existingUser = await User.findOne({ 
      username: trimmedUsername, 
      _id: { $ne: req.user.id } 
    }).select("_id").lean();
    if (existingUser) {
      return res.status(409).json({ error: "Username is already taken" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { username: trimmedUsername },
      { new: true }
    ).select("username stats createdAt").lean();

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Username updated successfully",
      user: toPublicProfile(updatedUser),
    });
  } catch (err) {
    console.error(`[User] Update username error: ${err}`);
    return res.status(500).json({ error: "Failed to update username" });
  }
});

// to get the req sender relation with a target user
router.get("/:userId/profile", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: "Invalid user ID" });
    }

    const [targetUser, currentUser] = await Promise.all([
      User.findById(userId).select("username stats createdAt friendRequests.sender").lean(),
      User.findById(currentUserId).select("friends friendRequests.sender").lean(),
    ]);

    if (!targetUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const profile = toPublicProfile(targetUser);
    let isFriend = false;
    let hasSentRequest = false;
    let hasReceivedRequest = false;

    if (currentUserId !== userId && currentUser) {
      isFriend = (currentUser.friends || []).some(
        (friendId) => friendId.toString() === userId
      );

      hasSentRequest = (targetUser.friendRequests || []).some(
        (reqItem) => reqItem.sender && reqItem.sender.toString() === currentUserId
      );
      hasReceivedRequest = (currentUser.friendRequests || []).some(
        (reqItem) => reqItem.sender && reqItem.sender.toString() === userId
      );
    }

    return res.status(200).json({
      user: {
        ...profile,
        isFriend,
        hasSentRequest,
        hasReceivedRequest,
      },
    });
  } catch (error) {
    console.error(`[User] get profile error: ${error}`);
    return res.status(500).json({ error: "Failed to fetch player profile" });
  }
});

router.get("/:userId/games", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: "[User] not a valid user id" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const resultFilter = req.query.result;
    const skip = (page - 1) * limit;

    let filter = {
      $or: [{ "players.white": userId }, { "players.black": userId }],
    };

    if (resultFilter === "win") {
      filter = {
        $or: [
          { "players.white": userId, "result.winner": "white" },
          { "players.black": userId, "result.winner": "black" },
        ],
      };
    } else if (resultFilter === "loss") {
      filter = {
        $or: [
          { "players.white": userId, "result.winner": "black" },
          { "players.black": userId, "result.winner": "white" },
        ],
      };
    } else if (resultFilter === "draw") {
      filter = {
        $or: [{ "players.white": userId }, { "players.black": userId }],
        "result.winner": "draw",
      };
    }

    const [games, totalGames] = await Promise.all([
      Game.find(filter)
        .select("gameId players result moves timeControl createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("players.white", "username")
        .populate("players.black", "username")
        .lean(),
      Game.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalGames / limit);

    const formattedGames = games.map((game) => {
      if (!game.players.white || !game.players.black) {
        return {
          id: game.gameId,
          opponent: "Unknown Opponent",
          opponentId: null,
          result: "draw",
          reason: game.result.reason,
          moves: Math.ceil(game.moves.length / 2),
          timeControl: "Unknown",
          date: new Date(game.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }),
        };
      }

      const isWhite = game.players.white._id.toString() === userId;
      const opponent = isWhite ? game.players.black.username : game.players.white.username;
      const opponentId = isWhite ? game.players.black._id.toString() : game.players.white._id.toString();

      let resultText = "draw";
      if (game.result.winner === "white") {
        resultText = isWhite ? "win" : "loss";
      } else if (game.result.winner === "black") {
        resultText = isWhite ? "loss" : "win";
      }

      const minutes = Math.round(game.timeControl.base / 60000);
      const incSeconds = Math.round(game.timeControl.increment / 1000);
      const tcLabel = incSeconds > 0 ? `${minutes}+${incSeconds}` : `${minutes} min`;

      return {
        id: game.gameId,
        opponent,
        opponentId,
        result: resultText,
        reason: game.result.reason,
        moves: Math.ceil(game.moves.length / 2),
        timeControl: tcLabel,
        date: new Date(game.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric", 
        }),
      };
    });
    res.json({ games: formattedGames, totalPages, currentPage: page, totalGames });
  } catch (err) {
    console.error(`[User] Get games error: ${err}`);
    res.status(500).json({ error: "Failed to fetch player game history" });
  }
});

router.get("/game/:gameId", async (req, res) => {
  try {
    const gameId = req.params.gameId;
    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return res.status(400).json({ success: false, error: "[User] not a valid game id" });
    }
    const game = await Game.findOne({ gameId: req.params.gameId })
      .select("gameId players result moves fen timeControl createdAt")
      .populate("players.white", "username")
      .populate("players.black", "username")
      .lean();

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    res.json({
      game: {
        gameId: game.gameId,
        players: {
          white: {
            id: game.players.white?._id?.toString() || null,
            name: game.players.white?.username || "Unknown",
          },
          black: {
            id: game.players.black?._id?.toString() || null,
            name: game.players.black?.username || "Unknown",
          },
        },
        result: game.result,
        moves: game.moves.map((m) => ({
          san: m.san,
          from: m.from,
          to: m.to,
          fen: m.fen,
          capturedPiece: m.capturedPiece || null,
          timestamp: m.timestamp || null,
          clocks: m.clocks || null,
        })),
        fen: game.fen,
        timeControl: {
          base: game.timeControl.base,
          increment: game.timeControl.increment,
        },
        createdAt: game.createdAt,
      },
    });
  } catch (err) {
    console.error(`[Game] Get game detail error: ${err}`);
    res.status(500).json({ error: "Failed to fetch game details" });
  }
});

export default router;