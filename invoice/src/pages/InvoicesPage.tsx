import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { invoicesApi } from '../api';
import { formatCurrency, formatDate } from '../utils';
import type { Invoice } from '../types';
import toast from 'react-hot-toast';
import {
  Plus, Search, Download, Eye, Copy, Trash2, Filter, X,
  FileText, ChevronLeft, ChevronRight, Edit2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { draft: 'badge-draft', sent: 'badge-sent', paid: 'badge-paid', cancelled: 'badge-cancelled' };
  return <span className={`badge ${map[status] || 'badge-draft'}`}>{status}</span>;
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isGSTPanel } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    invoice_number: '', client_name: '',
    invoice_type: isGSTPanel ? '' : 'NON_GST',
    from_date: '', to_date: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, filters],
    queryFn: () => invoicesApi.getAll({ page, limit: 15, ...filters }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      toast.success('Invoice deleted');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete invoice'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.duplicate(id),
    onSuccess: (res) => {
      toast.success(`Duplicated as ${res.data.invoice_number}`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: () => toast.error('Failed to duplicate invoice'),
  });

  const invoices: Invoice[] = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-['Outfit']">Invoices</h1>
          <p className="text-gray-500 text-sm">{total} invoice{total !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-outline flex items-center gap-2" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={15} /> Filters
          </button>
          <button className="btn-primary" onClick={() => navigate('/invoices/new')}>
            <Plus size={16} /> Create Invoice
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 slide-in">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input className="input-field" placeholder="Invoice No." value={filters.invoice_number}
              onChange={e => setFilters(f => ({ ...f, invoice_number: e.target.value }))} />
            <input className="input-field" placeholder="Client Name" value={filters.client_name}
              onChange={e => setFilters(f => ({ ...f, client_name: e.target.value }))} />
            {isGSTPanel && (
              <select className="input-field" value={filters.invoice_type}
                onChange={e => setFilters(f => ({ ...f, invoice_type: e.target.value }))}>
                <option value="">All Types</option>
                <option value="GST">GST</option>
                <option value="NON_GST">Non-GST</option>
              </select>
            )}
            <input type="date" className="input-field" value={filters.from_date}
              onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))} />
            <input type="date" className="input-field" value={filters.to_date}
              onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))} />
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn-primary text-xs py-1.5 px-3" onClick={() => setPage(1)}>Apply</button>
            <button className="btn-outline text-xs py-1.5 px-3" onClick={() => { setFilters({ invoice_number: '', client_name: '', invoice_type: '', from_date: '', to_date: '' }); setPage(1); }}>
              <X size={12} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-12 rounded"></div>)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText size={48} className="mx-auto mb-4 opacity-40" />
            <p className="font-medium">No invoices found</p>
            <p className="text-sm">Create your first invoice to get started</p>
            <button className="btn-primary mt-4" onClick={() => navigate('/invoices/new')}>
              <Plus size={14} /> Create Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>GST Type</th>
                  <th>Date</th>
                  <th>Subtotal</th>
                  <th>GST</th>
                  <th>Grand Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv._id}>
                    <td>
                      <span className="font-bold text-blue-700 cursor-pointer hover:underline"
                        onClick={() => navigate(`/invoices/${inv._id}`)}>
                        {inv.invoice_number}
                      </span>
                    </td>
                    <td>
                      <div className="font-medium text-gray-800">{inv.client?.client_name}</div>
                      {inv.client?.gst_number && <div className="text-xs text-gray-400">{inv.client.gst_number}</div>}
                    </td>
                    <td>
                      <span className={`badge ${inv.invoice_type === 'GST' ? 'badge-gst' : 'badge-non-gst'}`}>
                        {inv.invoice_type === 'GST' ? 'GST' : 'Non-GST'}
                      </span>
                    </td>
                    <td>
                      {inv.invoice_type === 'GST' ? (
                        <span className="text-xs font-medium text-gray-600">
                          {inv.gst_type === 'CGST_SGST' ? 'CGST + SGST' : 'IGST'}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="text-gray-500">{formatDate(inv.invoice_date)}</td>
                    <td className="text-gray-700">{formatCurrency(inv.subtotal)}</td>
                    <td className="text-gray-700">{formatCurrency(inv.total_gst)}</td>
                    <td><span className="font-bold text-gray-800">{formatCurrency(inv.grand_total)}</span></td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => navigate(`/invoices/${inv._id}`)}
                          className="p-1.5 rounded text-blue-600 hover:bg-blue-50" title="View">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => navigate(`/invoices/${inv._id}/edit`)}
                          className="p-1.5 rounded text-indigo-600 hover:bg-indigo-50" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => invoicesApi.downloadPDF(inv._id, inv.invoice_number)}
                          className="p-1.5 rounded text-green-600 hover:bg-green-50" title="Download PDF">
                          <Download size={14} />
                        </button>
                        <button onClick={() => duplicateMutation.mutate(inv._id)}
                          className="p-1.5 rounded text-amber-600 hover:bg-amber-50" title="Duplicate">
                          <Copy size={14} />
                        </button>
                        <button onClick={() => setDeleteId(inv._id)}
                          className="p-1.5 rounded text-red-600 hover:bg-red-50" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button className="btn-outline py-1 px-3" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={14} />
              </button>
              <button className="btn-outline py-1 px-3" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Invoice?</h3>
              <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button className="flex-1 btn-outline" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="flex-1 btn-danger" onClick={() => deleteMutation.mutate(deleteId)}>
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
