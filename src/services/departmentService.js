import apiClient from "./apiClient";

export const departmentService = {
  async getDepartments(params = {}) {
    const response = await apiClient.get("/departments", params);
    return response?.data || response;
  },

  async getDepartmentById(id) {
    const response = await apiClient.get(`/departments/${id}`);
    return response?.data || response;
  },

  async createDepartment(departmentData) {
    const response = await apiClient.post("/departments", departmentData);
    return response?.data || response;
  },

  async updateDepartment(id, departmentData) {
    const response = await apiClient.put(`/departments/${id}`, departmentData);
    return response?.data || response;
  },

  async deleteDepartment(id) {
    const response = await apiClient.delete(`/departments/${id}`);
    return response?.data || response;
  },
};

export default departmentService;
