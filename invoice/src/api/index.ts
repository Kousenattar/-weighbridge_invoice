import api from './client';
import type { User } from '../types';
import toast from 'react-hot-toast';

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (name: string, email: string, password: string, role?: string, panel?: string) => {
    const res = await api.post('/auth/register', { name, email, password, role, panel });
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
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const filename = `${invoiceNumber}.pdf`;

      // Try Web Share API for mobile devices
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'application/pdf' })] })) {
        try {
          await navigator.share({
            files: [new File([blob], filename, { type: 'application/pdf' })],
            title: filename,
          });
          return;
        } catch (e) {
          console.log('Share failed or cancelled, falling back to download', e);
        }
      }

      // Fallback to standard download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error: any) {
      console.error('PDF download error:', error);
      let errorMsg = 'Failed to download PDF. Please try again.';
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          errorMsg = JSON.parse(text).message || errorMsg;
        } catch (e) {}
      }
      toast.error(errorMsg);
    }
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
    try {
      const res = await api.get(`/estimates/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const filename = `${estimateNumber}.pdf`;

      // Try Web Share API for mobile devices
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'application/pdf' })] })) {
        try {
          await navigator.share({
            files: [new File([blob], filename, { type: 'application/pdf' })],
            title: filename,
          });
          return;
        } catch (e) {
          console.log('Share failed or cancelled, falling back to download', e);
        }
      }

      // Fallback to standard download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error: any) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF. Please try again.');
    }
  },
};

