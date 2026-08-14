import api from './api';

export const transportService = {
  getTransports: async (params = {}) => {
    const response = await api.get('/transports', { params });
    return response.data;
  },

  getAllTransports: async () => {
    const response = await api.get('/transports/all');
    return response.data;
  },

  getTransport: async (id) => {
    const response = await api.get(`/transports/${id}`);
    return response.data;
  },

  createTransport: async (data) => {
    const response = await api.post('/transports', data);
    return response.data;
  },

  updateTransport: async (id, data) => {
    const response = await api.put(`/transports/${id}`, data);
    return response.data;
  },

  deleteTransport: async (id) => {
    const response = await api.delete(`/transports/${id}`);
    return response.data;
  },
};

