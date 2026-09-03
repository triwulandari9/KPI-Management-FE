import apiClient from "./apiClient";

export const employeeService = {
  async getEmployees(params = {}) {
    const response = await apiClient.get("/employees", params);
    return response?.data || response;
  },

  async getEmployeeById(id) {
    const response = await apiClient.get(`/employees/${id}`);
    return response?.data || response;
  },

  async createEmployee(employeeData) {
    const response = await apiClient.post("/employees", employeeData);
    return response?.data || response;
  },

  async updateEmployee(id, employeeData) {
    const response = await apiClient.put(`/employees/${id}`, employeeData);
    return response?.data || response;
  },

  async deleteEmployee(id) {
    const response = await apiClient.delete(`/employees/${id}`);
    return response?.data || response;
  },
};

export default employeeService;
