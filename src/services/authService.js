import apiClient from "./apiClient";

export const authService = {
  async loginWithEmail(email, password) {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();

    try {
      const response = await apiClient.post("/auth/login", {
        email: cleanEmail,
        password: cleanPassword,
      });

      const token = response?.token || response?.data?.token || response?.accessToken;
      if (token) {
        localStorage.setItem("kpi_token", token);
      }

      let user = response.user || response.data?.user || response.data || response;
      if (user && typeof user === "object") {
        user = {
          ...user,
          role: user.role?.toLowerCase() === "hr" ? "HR" : user.role,
        };
      }

      return user;
    } catch (err) {
      throw err;
    }
  },

  async login(email, password) {
    return this.loginWithEmail(email, password);
  },

  async register(userData) {
    const response = await apiClient.post("/auth/register", userData);
    const token = response?.token || response?.data?.token || response?.accessToken;
    if (token) {
      localStorage.setItem("kpi_token", token);
    }
    return response.data || response;
  },

  async loginWithGoogle(credentialResponse) {
    const tokenPayload = typeof credentialResponse === "string" 
      ? credentialResponse 
      : (credentialResponse?.credential || credentialResponse?.token);

    const response = await apiClient.post("/auth/google", {
      token: tokenPayload,
      credential: tokenPayload,
    });

    const token = response?.token || response?.data?.token || response?.accessToken;
    if (token) {
      localStorage.setItem("kpi_token", token);
    }

    let user = response.user || response.data?.user || response.data || response;
    if (user && typeof user === "object") {
      user = {
        ...user,
        role: user.role?.toLowerCase() === "hr" ? "HR" : user.role,
      };
    }
    return user;
  },

  async getCurrentUser() {
    try {
      const response = await apiClient.get("/auth/me");
      return response.user || response.data?.user || response.data || response;
    } catch {
      return null;
    }
  },

  async getMe() {
    return this.getCurrentUser();
  },

  logout() {
    localStorage.removeItem("kpi_token");
    localStorage.removeItem("kpi_user");
    localStorage.removeItem("kpi_session_expiry");
  },
};

export default authService;
