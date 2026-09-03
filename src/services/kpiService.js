import apiClient from "./apiClient";
import { kpiTemplateService } from "./kpiTemplateService";
import { kpiAssessmentService } from "./kpiAssessmentService";

export const kpiService = {
  async getKpiEvaluations(params = {}) {
    const response = await apiClient.get("/kpi/evaluations", params);
    return response?.data || response;
  },

  async saveKpiEvaluations(payload) {
    const response = await apiClient.post("/kpi/evaluations", payload);
    return response?.data || response;
  },

  templates: kpiTemplateService,
  assessments: kpiAssessmentService,
};

export default kpiService;
