import { create } from "zustand";

export const useQueueStore = create(
  (set, get) => ({
    activeQueues: {}, // queueKey => { timeControl, searchStartedAt }
    matchedGameId: null,
    matchData: null,

    get status() {
      const state = get();
      if (state.matchedGameId) return "matched";
      if (Object.keys(state.activeQueues).length > 0) return "searching";
      return "idle";
    },

    getStatus: () => {
      const state = get();
      if (state.matchedGameId) return "matched";
      if (Object.keys(state.activeQueues).length > 0) return "searching";
      return "idle";
    },

    getEarliestSearchStartedAt: () => {
      const queues = get().activeQueues;
      const times = Object.values(queues).map(q => q.searchStartedAt);
      return times.length > 0 ? Math.min(...times) : null;
    },

    getQueueCount: () => {
      return Object.keys(get().activeQueues).length;
    },

    isQueueActive: (queueKey) => {
      return queueKey in get().activeQueues;
    },

    addQueue: (queueKey, timeControl) => set((state) => ({
      activeQueues: {
        ...state.activeQueues,
        [queueKey]: { timeControl, searchStartedAt: Date.now() },
      },
      matchedGameId: null,
      matchData: null,
    })),

    removeQueue: (queueKey) => set((state) => {
      const { [queueKey]: _, ...rest } = state.activeQueues;
      return { activeQueues: rest };
    }),

    removeQueues: (queueKeys) => set((state) => {
      const updated = { ...state.activeQueues };
      for (const key of queueKeys) {
        delete updated[key];
      }
      return { activeQueues: updated };
    }),

    setMatched: (gameId, matchData) => set({
      activeQueues: {},
      matchedGameId: gameId,
      matchData,
    }),

    reset: () => set({
      activeQueues: {},
      matchedGameId: null,
      matchData: null,
    }),
  })
);