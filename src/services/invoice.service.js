import api from './api';

const downloadBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
};

export const invoiceService = {
  getInvoices: async (params = {}) => {
    const response = await api.get('/invoices', { params });
    return response.data;
  },

  getInvoice: async (id) => {
    const response = await api.get('/invoices/' + id);
    return response.data;
  },

  createInvoice: async (data) => {
    const response = await api.post('/invoices', data);
    return response.data;
  },

  cancelInvoice: async (id, reason) => {
    const response = await api.put('/invoices/' + id + '/cancel', { reason });
    return response.data;
  },

  reprintInvoice: async (id) => {
    const response = await api.post('/invoices/' + id + '/reprint');
    return response.data;
  },

  getPDFBlob: async (id) => {
    const response = await api.get('/invoices/' + id + '/pdf', { responseType: 'blob' });
    return response.data;
  },

  getInvoiceHtml: async (id) => {
    const response = await api.get('/invoices/' + id + '/html', { responseType: 'text' });
    return response.data;
  },

  trackPrint: async (id) => {
    const response = await api.post('/invoices/' + id + '/print');
    return response.data;
  },

  unlockInvoice: async (id) => {
    const response = await api.post('/invoices/' + id + '/unlock');
    return response.data;
  },

  downloadPDF: async (id, invoiceNumber) => {
    const blob = await invoiceService.getPDFBlob(id);
    downloadBlob(blob, (invoiceNumber || 'invoice_' + id) + '.pdf');
  },

  downloadPartyListPDF: async (companyId, replacementIds, date, transport, invoiceNo) => {
    let url = '/party-list/' + companyId + '/pdf?';
    const params = new URLSearchParams();
    if (replacementIds?.length) params.append('replacementIds', replacementIds.join(','));
    if (date) params.append('date', date);
    if (transport) params.append('transport', transport);
    if (invoiceNo) params.append('invoiceNo', invoiceNo);
    url += params.toString();

    const response = await api.get(url, { responseType: 'blob' });
    downloadBlob(response.data, 'PartyList_' + (invoiceNo || companyId) + '.pdf');
  },
};
