import apiClient from "./apiClient";

export const kpiTemplateService = {
  async getKpiTemplates(params = {}) {
    const response = await apiClient.get("/kpi-templates", params);
    return response?.data || response;
  },

  async getKpiTemplateById(id) {
    const response = await apiClient.get(`/kpi-templates/${id}`);
    return response?.data || response;
  },

  async createKpiTemplate(templateData) {
    const response = await apiClient.post("/kpi-templates", templateData);
    return response?.data || response;
  },

  async updateKpiTemplate(id, templateData) {
    const response = await apiClient.put(`/kpi-templates/${id}`, templateData);
    return response?.data || response;
  },

  async deleteKpiTemplate(id) {
    const response = await apiClient.delete(`/kpi-templates/${id}`);
    return response?.data || response;
  },
};

export default kpiTemplateService;
