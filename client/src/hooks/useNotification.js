import { create } from "zustand";

export const useNotificationStore = create((set, get) => ({
  toasts: [],
  confirmation: null, // { title, message, onConfirm, onCancel, confirmText, cancelText, type }

  addToast: (message, type = "info", duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  showConfirmation: ({ title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", type = "default" }) => {
    set({
      confirmation: {
        title,
        message,
        onConfirm: () => {
          if (onConfirm) onConfirm();
          set({ confirmation: null });
        },
        onCancel: () => {
          if (onCancel) onCancel();
          set({ confirmation: null });
        },
        confirmText,
        cancelText,
        type,
      },
    });
  },

  closeConfirmation: () => {
    const confirmation = get().confirmation;
    if (confirmation && confirmation.onCancel) {
      confirmation.onCancel();
    } else {
      set({ confirmation: null });
    }
  },
}));
