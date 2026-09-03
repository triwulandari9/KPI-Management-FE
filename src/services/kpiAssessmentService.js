import apiClient from "./apiClient";

export const kpiAssessmentService = {
  async getKpiAssessments(params = {}) {
    const response = await apiClient.get("/kpi-assessments", params);
    return response?.data || response;
  },

  async getKpiAssessmentById(id) {
    const response = await apiClient.get(`/kpi-assessments/${id}`);
    return response?.data || response;
  },

  async createKpiAssessment(assessmentData) {
    const response = await apiClient.post("/kpi-assessments", assessmentData);
    return response?.data || response;
  },

  async updateKpiAssessment(id, assessmentData) {
    const response = await apiClient.put(`/kpi-assessments/${id}`, assessmentData);
    return response?.data || response;
  },

  async submitKpiAssessment(id, submitData = {}) {
    const response = await apiClient.patch(`/kpi-assessments/${id}/submit`, submitData);
    return response?.data || response;
  },

  async reviewKpiAssessment(id, reviewData = {}) {
    const response = await apiClient.patch(`/kpi-assessments/${id}/review`, reviewData);
    return response?.data || response;
  },
};

export default kpiAssessmentService;
