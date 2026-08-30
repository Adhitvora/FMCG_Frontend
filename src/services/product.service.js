import api from './api';

export const productService = {
  getProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getProduct: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  searchProducts: async (params = {}, signal) => {
    const response = await api.get('/products/search', { params, signal });
    return response.data;
  },

  createProduct: async (data) => {
    const response = await api.post('/products', data);
    return response.data;
  },

  updateProduct: async (id, data) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  downloadSampleExcel: async () => {
    const response = await api.get('/products/sample-excel', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'product_sample.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  previewImport: async (file, companyId) => {
    const formData = new FormData();
    formData.append('file', file);
    if (companyId) formData.append('companyId', companyId);
    const response = await api.post('/products/import/preview', formData);
    return response.data;
  },

  importProducts: async (file, companyId) => {
    const formData = new FormData();
    formData.append('file', file);
    if (companyId) formData.append('companyId', companyId);
    const response = await api.post('/products/import', formData);
    return response.data;
  },
};
