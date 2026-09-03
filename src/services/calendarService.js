import apiClient from "./apiClient";

export const calendarService = {
  async getCalendarEvents(params = {}) {
    const response = await apiClient.get("/calendar", params);
    return response?.data || response;
  },

  async getEvents(params = {}) {
    return this.getCalendarEvents(params);
  },

  async createCalendarEvent(eventData) {
    const response = await apiClient.post("/calendar", eventData);
    return response?.data || response;
  },

  async createEvent(eventData) {
    return this.createCalendarEvent(eventData);
  },

  async updateCalendarEvent(id, eventData) {
    const response = await apiClient.put(`/calendar/${id}`, eventData);
    return response?.data || response;
  },

  async updateEvent(id, eventData) {
    return this.updateCalendarEvent(id, eventData);
  },

  async deleteCalendarEvent(id) {
    const response = await apiClient.delete(`/calendar/${id}`);
    return response?.data || response;
  },

  async deleteEvent(id) {
    return this.deleteCalendarEvent(id);
  },
};

export default calendarService;
