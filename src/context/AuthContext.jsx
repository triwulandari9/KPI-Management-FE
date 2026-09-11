import { createContext, useContext, useState, useEffect, useCallback } from "react";
import authService from "../services/authService";
import { employeeService } from "../services/employeeService";

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

  const login = async (userData) => {
    // If avatar is missing, try to fetch it from backend user profile or employee record
    let finalUser = { ...userData };
    if (!finalUser?.avatar) {
      try {
        const me = await authService.getCurrentUser();
        if (me?.avatar) {
          finalUser.avatar = me.avatar;
        }
      } catch {
        // Fallback to employee record if getCurrentUser failed
      }

      if (!finalUser?.avatar) {
        try {
          const emp = await employeeService.getEmployeeById(finalUser._id || finalUser.id);
          if (emp?.avatar) {
            finalUser.avatar = emp.avatar;
          }
        } catch (e) {
          console.warn("Failed to sync avatar after login", e);
        }
      }
    }
    const expiryTime = Date.now() + SESSION_DURATION;
    setCurrentUser(finalUser);
    localStorage.setItem("kpi_user", JSON.stringify(finalUser));
    localStorage.setItem("kpi_session_expiry", expiryTime.toString());
    // Dispatch global avatar update event if avatar is now present
    if (finalUser?.avatar) {
      window.dispatchEvent(
        new CustomEvent("user_avatar_updated", {
          detail: { avatar: finalUser.avatar, email: finalUser.email, id: finalUser._id || finalUser.id },
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
        } catch { }
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

  // -------------------------------
  // 1️⃣ Refresh user avatar on app start (e.g., page reload / new tab)
  // -------------------------------
  useEffect(() => {
    const token = localStorage.getItem("kpi_token");
    const storedUser = localStorage.getItem("kpi_user");
    if (token && storedUser) {
      // If we already have a user in localStorage, try to ensure avatar is up‑to‑date
      (async () => {
        try {
          const parsed = JSON.parse(storedUser);
          if (!parsed?.avatar) {
            let foundAvatar = "";
            try {
              const me = await authService.getCurrentUser();
              if (me?.avatar) {
                foundAvatar = me.avatar;
              }
            } catch {}

            if (!foundAvatar) {
              try {
                const emp = await employeeService.getEmployeeById(parsed._id || parsed.id);
                if (emp?.avatar) {
                  foundAvatar = emp.avatar;
                }
              } catch {}
            }

            if (foundAvatar) {
              const updated = { ...parsed, avatar: foundAvatar };
              setCurrentUser(updated);
              localStorage.setItem("kpi_user", JSON.stringify(updated));
              // Broadcast avatar change for other components/tabs
              window.dispatchEvent(
                new CustomEvent("user_avatar_updated", {
                  detail: { avatar: foundAvatar, email: updated.email, id: updated._id || updated.id },
                })
              );
            }
          }
        } catch (e) {
          console.warn("Failed to sync avatar on app init", e);
        }
      })();
    }
  }, []);

  // -------------------------------
  // 2️⃣ Existing session‑expiry checker (unchanged)
  // -------------------------------
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
      // Dispatch generic user update event for other fields
      window.dispatchEvent(
        new CustomEvent("current_user_updated", {
          detail: { user: nextUser },
        })
      );
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
