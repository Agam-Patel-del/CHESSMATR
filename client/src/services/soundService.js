class SoundService {
  constructor() {
    this.isMuted = localStorage.getItem("chessmatr_muted") === "true";

    this.sounds = {
      move: new Audio("/sounds/move.mp3"),
      capture: new Audio("/sounds/capture.mp3"),
      gameStart: new Audio("/sounds/genericnotify.mp3"),
      gameOver: new Audio("/sounds/confirmation.mp3"),
      error: new Audio("/sounds/lowtime.mp3"),
    };

    Object.values(this.sounds).forEach((audio) => {
      audio.volume = 0.8;
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem("chessmatr_muted", String(this.isMuted));
    return this.isMuted;
  }

  setMuted(muted) {
    this.isMuted = muted;
    localStorage.setItem("chessmatr_muted", String(muted));
  }

  playSound(name) {
    if (this.isMuted) return;
    const audio = this.sounds[name];
    if (audio) {
      try {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } catch (e) {
        console.warn(`[Sound] Error playing ${name}:`, e);
      }
    }
  }

  playMove() {
    this.playSound("move");
  }

  playCapture() {
    this.playSound("capture");
  }

  playGameStart() {
    this.playSound("gameStart");
  }

  playGameOver() {
    this.playSound("gameOver");
  }

  playError() {
    this.playSound("error");
  }

  playChallenge() {
    this.playSound("gameStart");
  }
}

export const soundService = new SoundService();