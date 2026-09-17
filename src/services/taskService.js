import apiClient from "./apiClient";

export const taskService = {
  async getTasks(params = {}) {
    const response = await apiClient.get("/tasks", params);
    return response?.data || response;
  },

  async getAllTasks(params = {}) {
    return this.getTasks(params);
  },

  async getTaskById(id) {
    const response = await apiClient.get(`/tasks/${id}`);
    return response?.data || response;
  },

  async getTaskHistory(id) {
    const response = await apiClient.get(`/tasks/${id}/history`);
    return response?.data || response;
  },

  async createTask(taskData) {
    const response = await apiClient.post("/tasks", taskData);
    return response?.data || response;
  },

  async updateTask(id, taskData) {
    const response = await apiClient.put(`/tasks/${id}`, taskData);
    return response?.data || response;
  },

  async deleteTask(id) {
    const response = await apiClient.delete(`/tasks/${id}`);
    return response?.data || response;
  },

  async updateTaskStatus(id, status) {
    const response = await apiClient.patch(`/tasks/${id}/status`, { status });
    return response?.data || response;
  },

  async updateTaskPoint(id, point) {
    const response = await apiClient.patch(`/tasks/${id}/point`, { point: Number(point) });
    return response?.data || response;
  },

  async rejectTaskQA(id) {
    const response = await apiClient.post(`/tasks/${id}/reject`);
    return response?.data || response;
  },
};

export default taskService;
