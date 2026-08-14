import api from './api';

export const companyService = {
  getCompanies: async (params = {}) => {
    const response = await api.get('/companies', { params });
    return response.data;
  },

  getAllCompanies: async () => {
    const response = await api.get('/companies/all');
    return response.data;
  },

  getCompany: async (id) => {
    const response = await api.get(`/companies/${id}`);
    return response.data;
  },

  createCompany: async (formData) => {
    const response = await api.post('/companies', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateCompany: async (id, formData) => {
    const response = await api.put(`/companies/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteCompany: async (id) => {
    const response = await api.delete(`/companies/${id}`);
    return response.data;
  },
};

