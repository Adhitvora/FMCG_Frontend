import api from './api';

export const partyService = {
  getParties: async (params = {}) => {
    const response = await api.get('/parties', { params });
    return response.data;
  },

  getAllParties: async (search = '') => {
    const response = await api.get('/parties/all', { params: { search } });
    return response.data;
  },

  getParty: async (id) => {
    const response = await api.get(`/parties/${id}`);
    return response.data;
  },

  searchReplacementParties: async (params = {}) => {
    const response = await api.get('/search/parties', { params });
    return response.data;
  },

  getReplacementSummary: async (id, params = {}) => {
    const response = await api.get(`/parties/${id}/replacement-summary`, { params });
    return response.data;
  },

  createParty: async (data) => {
    const response = await api.post('/parties', data);
    return response.data;
  },

  updateParty: async (id, data) => {
    const response = await api.put(`/parties/${id}`, data);
    return response.data;
  },

  deleteParty: async (id) => {
    const response = await api.delete(`/parties/${id}`);
    return response.data;
  },

  downloadSampleExcel: async () => {
    const response = await api.get('/parties/sample-excel', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'party_sample.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  importParties: async (file, strategy = 'skip') => {
    const formData = new FormData();
    formData.append('excelFile', file);
    formData.append('strategy', strategy);
    const response = await api.post('/parties/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
