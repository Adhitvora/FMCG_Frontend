import api from './api';

export const replacementService = {
  getReplacements: async (params = {}) => {
    const response = await api.get('/replacements', { params });
    return response.data;
  },

  getReplacement: async (id) => {
    const response = await api.get(`/replacements/${id}`);
    return response.data;
  },

  getReplacement360: async (id) => {
    const response = await api.get(`/replacements/${id}/360`);
    return response.data;
  },

  createReplacement: async (formData) => {
    const response = await api.post('/replacements', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateReplacement: async (id, data) => {
    const response = await api.put(`/replacements/${id}`, data);
    return response.data;
  },

  updateDispatch: async (id, formData) => {
    const response = await api.put(`/replacements/${id}/dispatch`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateApproval: async (id, formData) => {
    const response = await api.put(`/replacements/${id}/approval`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  unlockDispatch: async (id, data = {}) => {
    const response = await api.post(`/replacements/${id}/unlock-dispatch`, data);
    return response.data;
  },
};

export const masterCartonService = {
  getMasterCartons: async (params = {}) => {
    const response = await api.get('/master-cartons', { params });
    return response.data;
  },

  getMasterCarton: async (id) => {
    const response = await api.get(`/master-cartons/${id}`);
    return response.data;
  },

  createMasterCarton: async (data) => {
    const response = await api.post('/master-cartons', data);
    return response.data;
  },

  addEntries: async (id, entries) => {
    const response = await api.put(`/master-cartons/${id}/add`, { entries });
    return response.data;
  },

  removeEntry: async (id, replacementId) => {
    const response = await api.put(`/master-cartons/${id}/remove`, { replacementId });
    return response.data;
  },

  sealCarton: async (id) => {
    const response = await api.put(`/master-cartons/${id}/seal`);
    return response.data;
  },
};
