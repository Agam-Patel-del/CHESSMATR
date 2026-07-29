import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react"
import { socket } from "../config/socket";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      if (!socket.connected) {
        socket.connect();
      }
    } else {
      if (socket.connected) {
        socket.disconnect();
      }
    }
  }, [user]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = useCallback(async (identifier, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      const error = new Error(data.error || "Login failed");
      error.status = res.status;
      error.email = data.email;
      throw error;
    }

    setUser(data.user);
  }, []);

  const register = useCallback(async (username, email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Registration failed");
    }

    return data;
  }, []);

  const verifyEmail = useCallback(async (email, otp) => {
    const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Verification failed");
    }

    setUser(data.user);
    return data;
  }, []);

  const resendOtp = useCallback(async (email) => {
    const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to resend code");
    }

    return data;
  }, []);

  const sendResetLink = useCallback(async (email) => {
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to request link");
    }

    return data;
  }, []);

  const resetPassword = useCallback(async (email, token, password) => {
    const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, token, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Password reset failed");
    }

    return data;
  }, []);

  const updateUsername = useCallback(async (newUsername) => {
    const res = await fetch(`${API_BASE}/api/users/profile/username`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username: newUsername }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to update username");
    }

    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  }, []);

  const isAuthenticated = user !== null;
  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      register,
      verifyEmail,
      resendOtp,
      sendResetLink,
      resetPassword,
      updateUsername,
      logout,
    }),
    [
      user,
      isAuthenticated,
      isLoading,
      login,
      register,
      verifyEmail,
      resendOtp,
      sendResetLink,
      resetPassword,
      updateUsername,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
