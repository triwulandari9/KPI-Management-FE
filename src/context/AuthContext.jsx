import { createContext, useContext, useState, useEffect, useCallback } from "react";
import authService from "../services/authService";

const AuthContext = createContext();

export const SESSION_DURATION = 24 * 60 * 60 * 1000;

export function AuthProvider({ children }) {
  const getValidSessionUser = useCallback(() => {
    try {
      const savedUser = localStorage.getItem("kpi_user");
      const expiry = localStorage.getItem("kpi_session_expiry");

      if (!savedUser) return null;

      if (expiry) {
        const isExpired = Date.now() > Number(expiry);
        if (isExpired) {
          localStorage.removeItem("kpi_user");
          localStorage.removeItem("kpi_session_expiry");
          localStorage.removeItem("kpi_token");
          return null;
        }
      } else {
        const newExpiry = Date.now() + SESSION_DURATION;
        localStorage.setItem("kpi_session_expiry", newExpiry.toString());
      }

      return JSON.parse(savedUser);
    } catch {
      return null;
    }
  }, []);

  const [currentUser, setCurrentUser] = useState(() => getValidSessionUser());

  const login = (userData) => {
    const expiryTime = Date.now() + SESSION_DURATION;
    setCurrentUser(userData);
    localStorage.setItem("kpi_user", JSON.stringify(userData));
    localStorage.setItem("kpi_session_expiry", expiryTime.toString());
    // Dispatch global avatar update event if avatar provided on login
    if (userData?.avatar) {
      window.dispatchEvent(
        new CustomEvent("user_avatar_updated", {
          detail: { avatar: userData.avatar, email: userData.email, id: userData._id || userData.id },
        })
      );
    }
  };

  // Broadcast avatar changes across tabs/windows
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "kpi_user" && e.newValue) {
        try {
          const user = JSON.parse(e.newValue);
          if (user?.avatar) {
            window.dispatchEvent(
              new CustomEvent("user_avatar_updated", {
                detail: { avatar: user.avatar, email: user.email, id: user._id || user.id },
              })
            );
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Define logout function
  const logout = useCallback(() => {
    // Clear auth data via service
    authService.logout();
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    const checkSession = () => {
      const validUser = getValidSessionUser();
      if (!validUser && currentUser) {
        logout();
      }
    };

    const interval = setInterval(checkSession, 60 * 1000);
    window.addEventListener("focus", checkSession);
    window.addEventListener("visibilitychange", checkSession);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", checkSession);
      window.removeEventListener("visibilitychange", checkSession);
    };
  }, [currentUser, getValidSessionUser, logout]);

  const getRemainingSessionTime = () => {
    const expiry = localStorage.getItem("kpi_session_expiry");
    if (!expiry) return 0;
    return Math.max(0, Number(expiry) - Date.now());
  };

  const updateUserProfile = (updatedFields) => {
    setCurrentUser((prev) => {
      const nextUser = { ...(prev || {}), ...updatedFields };
      localStorage.setItem("kpi_user", JSON.stringify(nextUser));
      // Dispatch global avatar update event if avatar changed
      if (nextUser?.avatar) {
        window.dispatchEvent(
          new CustomEvent("user_avatar_updated", {
            detail: { avatar: nextUser.avatar, email: nextUser.email, id: nextUser._id || nextUser.id },
          })
        );
      }
      return nextUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: Boolean(currentUser),
        login,
        logout,
        updateUserProfile,
        getRemainingSessionTime,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
