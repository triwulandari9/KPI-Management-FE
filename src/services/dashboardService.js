import apiClient from "./apiClient";

export const dashboardService = {
  async getDashboardStats(params = {}) {
    const response = await apiClient.get("/dashboard/stats", params);
    return response?.data || response;
  },

  async getDashboardTasks(params = {}) {
    const response = await apiClient.get("/dashboard/tasks", params);
    return response?.data || response;
  },

  async updateDashboardTask(id, taskData) {
    const response = await apiClient.put(`/dashboard/tasks/${id}`, taskData);
    return response?.data || response;
  },

  async deleteDashboardTask(id) {
    const response = await apiClient.delete(`/dashboard/tasks/${id}`);
    return response?.data || response;
  },
};

export default dashboardService;
