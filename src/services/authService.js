import apiClient from "./apiClient";

export const authService = {
  async loginWithEmail(email, password) {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();

    const response = await apiClient.post("/auth/login", {
      email: cleanEmail,
      password: cleanPassword,
    });

    const token = response?.token || response?.data?.token || response?.accessToken;
    if (token) {
      localStorage.setItem("kpi_token", token);
    }

    return response?.user || response?.data?.user || response?.data || response;
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
    return response?.data || response;
  },

  async loginWithGoogle(credentialResponse) {
    const tokenPayload =
      typeof credentialResponse === "string"
        ? credentialResponse
        : credentialResponse?.credential || credentialResponse?.token;

    const response = await apiClient.post("/auth/google", {
      token: tokenPayload,
      credential: tokenPayload,
    });

    const token = response?.token || response?.data?.token || response?.accessToken;
    if (token) {
      localStorage.setItem("kpi_token", token);
    }

    return response?.user || response?.data?.user || response?.data || response;
  },

  async getCurrentUser() {
    const response = await apiClient.get("/auth/me");
    return response?.user || response?.data?.user || response?.data || response;
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

