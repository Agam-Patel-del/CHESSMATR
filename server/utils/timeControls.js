const TIME_CONTROLS = [
  { base: 1, increment: 0, category: "Bullet", label: "1+0", },
  { base: 1, increment: 1, category: "Bullet", label: "1+1" },
  { base: 2, increment: 1, category: "Bullet", label: "2+1" },
  { base: 3, increment: 0, category: "Blitz", label: "3+0" },
  { base: 3, increment: 2, category: "Blitz", label: "3+2" },
  { base: 5, increment: 0, category: "Blitz", label: "5+0" },
  { base: 5, increment: 3, category: "Blitz", label: "5+3" },
  { base: 10, increment: 0, category: "Rapid", label: "10+0" },
  { base: 10, increment: 5, category: "Rapid", label: "10+5" },
  { base: 15, increment: 10, category: "Rapid", label: "15+10" },
  { base: 30, increment: 0, category: "Rapid", label: "30+0" },
];

export function isValidTimeControl(base, increment) {
  return TIME_CONTROLS.some((tc) => {
    return tc.base === base && tc.increment === increment
  }
  );
}

export function getQueueKey(base, increment) {
  return `queue_${base}_${increment}`;
}

export function getTimeControlMs(base, increment) {
  return {
    baseMs: base * 60 * 1000,
    incrementMs: increment * 1000,
  };
}

export { TIME_CONTROLS };