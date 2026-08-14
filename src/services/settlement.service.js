import api from './api';

const openBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const pdfWindow = window.open(url, '_blank');

  if (!pdfWindow) {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
};

export const settlementService = {
  getSettlements: async (params = {}) => {
    const response = await api.get('/settlements', { params });
    return response.data;
  },

  getPendingSettlements: async (params = {}) => {
    const response = await api.get('/settlements/pending', { params });
    return response.data;
  },

  getSettlement: async (id) => {
    const response = await api.get(`/settlements/${id}`);
    return response.data;
  },

  createSettlement: async (data) => {
    const response = await api.post('/settlements', data);
    return response.data;
  },

  updateSettlement: async (id, data) => {
    const response = await api.put(`/settlements/${id}`, data);
    return response.data;
  },

  completeSettlement: async (id, data = {}) => {
    const response = await api.post(`/settlements/${id}/complete`, data);
    return response.data;
  },

  cancelSettlement: async (id, data = {}) => {
    const response = await api.post(`/settlements/${id}/cancel`, data);
    return response.data;
  },

  unlockSettlement: async (id, data = {}) => {
    const response = await api.post(`/settlements/${id}/unlock`, data);
    return response.data;
  },

  getPartySettlements: async (partyId) => {
    const response = await api.get(`/settlements/party/${partyId}`);
    return response.data;
  },

  getCompanySettlements: async (companyId) => {
    const response = await api.get(`/settlements/company/${companyId}`);
    return response.data;
  },

  getDashboard: async (params = {}) => {
    const response = await api.get('/settlements/dashboard', { params });
    return response.data;
  },

  getPDFBlob: async (id) => {
    const response = await api.get(`/settlements/${id}/pdf`, { responseType: 'blob' });
    return response.data;
  },

  openPDF: async (id, settlementNo) => {
    const blob = await settlementService.getPDFBlob(id);
    openBlob(blob, (settlementNo || 'settlement_' + id) + '.pdf');
  },
};
