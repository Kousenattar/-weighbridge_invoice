import api from './client';
import type { User } from '../types';

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (name: string, email: string, password: string, role?: string) => {
    const res = await api.post('/auth/register', { name, email, password, role });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await api.put('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },
};

export const settingsApi = {
  get: async () => {
    const res = await api.get('/settings');
    return res.data;
  },
  update: async (data: any) => {
    const res = await api.put('/settings', data);
    return res.data;
  },
};

export const clientsApi = {
  getAll: async (params?: Record<string, any>) => {
    const res = await api.get('/clients', { params });
    return res.data;
  },
  lookupGST: async (gstNumber: string) => {
    const res = await api.get(`/clients/gst/${gstNumber}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/clients', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put(`/clients/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/clients/${id}`);
    return res.data;
  },
};

export const invoicesApi = {
  getAll: async (params?: Record<string, any>) => {
    const res = await api.get('/invoices', { params });
    return res.data;
  },
  getDashboard: async () => {
    const res = await api.get('/invoices/dashboard');
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/invoices/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/invoices', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put(`/invoices/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/invoices/${id}`);
    return res.data;
  },
  duplicate: async (id: string) => {
    const res = await api.post(`/invoices/${id}/duplicate`);
    return res.data;
  },
  downloadPDF: async (id: string, invoiceNumber: string) => {
    const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoiceNumber}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  },
  getReportsSummary: async (params?: Record<string, any>) => {
    const res = await api.get('/invoices/reports/summary', { params });
    return res.data;
  },
};

export const purchasesApi = {
  getAll: async (params?: Record<string, any>) => {
    const res = await api.get('/purchases', { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/purchases/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/purchases', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put(`/purchases/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/purchases/${id}`);
    return res.data;
  },
  getSummary: async (params?: Record<string, any>) => {
    const res = await api.get('/purchases/summary', { params });
    return res.data;
  },
  getDashboard: async () => {
    const res = await api.get('/purchases/dashboard');
    return res.data;
  },
  extractBill: async (file: File) => {
    const form = new FormData();
    form.append('bill', file);
    const res = await api.post('/purchases/extract-bill', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  exportAll: async (params?: Record<string, any>) => {
    const res = await api.get('/purchases/export', { params });
    return res.data;
  },
};

export const estimatesApi = {
  getAll: async (params?: Record<string, any>) => {
    const res = await api.get('/estimates', { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/estimates/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/estimates', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put(`/estimates/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/estimates/${id}`);
    return res.data;
  },
  downloadPDF: async (id: string, estimateNumber: string) => {
    const res = await api.get(`/estimates/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${estimateNumber}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  },
};

