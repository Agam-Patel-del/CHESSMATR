import React, { useState } from "react";
import { useAuth } from "../../providers/AuthProvider";
import { soundService } from "../../services/soundService";
import { useNotificationStore } from "../../hooks/useNotification";
import "./SettingsPage.css";

export const SettingsPage = () => {
  const { user, updateUsername } = useAuth();
  const addToast = useNotificationStore((s) => s.addToast);

  const [soundEnabled, setSoundEnabled] = useState(!soundService.isMuted);
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

  const handleToggleSound = () => {
    const isMuted = soundService.toggleMute();
    setSoundEnabled(!isMuted);
    if (!isMuted) {
      soundService.playMove();
    }
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    const trimmed = newUsername.trim();

    if (!trimmed) {
      addToast("Username cannot be empty", "error");
      return;
    }
    if (trimmed === user?.username) {
      addToast("New username is identical to current username", "info");
      return;
    }
    setIsUpdatingUsername(true);
    try {
      await updateUsername(trimmed);
      addToast("Username updated successfully!", "success");
    } catch (err) {
      addToast(err.message || "Failed to update username", "error");
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Settings</h2>
        <p>Manage your account, preferences, and audio settings</p>
      </div>

      <div className="settings-grid">
        {/* --- Audio Settings --- */}
        <div className="settings-card audio-single-card">
          <div className="option-info">
            <span className="option-title">🔊 Sound Effects</span>
            <span className="option-desc">
              Play move, capture, and game event sounds
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={handleToggleSound}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {/* --- Account Settings Card --- */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h3>👤 Account Settings</h3>
            <p>Update your public profile details</p>
          </div>

          <form onSubmit={handleUpdateUsername} className="settings-form">
            <div className="form-group">
              <label htmlFor="username-input">Username</label>
              <div className="input-with-button">
                <input
                  id="username-input"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter new username"
                  minLength={3}
                  maxLength={20}
                  pattern="^[a-zA-Z0-9_]+$"
                  required
                />
                <button
                  type="submit"
                  className="settings-save-btn"
                  disabled={isUpdatingUsername || newUsername.trim() === user?.username}
                >
                  {isUpdatingUsername ? "Saving..." : "Update Username"}
                </button>
              </div>
              <span className="field-hint">
                3 to 20 characters (letters, numbers, underscores only)
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
