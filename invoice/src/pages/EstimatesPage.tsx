import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { estimatesApi } from '../api';
import { formatCurrency } from '../utils';
import { Plus, Search, Download, Eye, Trash2, ClipboardList, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', accepted: 'Accepted', rejected: 'Rejected',
};

export default function EstimatesPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [page,    setPage]    = useState(1);
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['estimates', search, status, page],
    queryFn: () => estimatesApi.getAll({ search: search || undefined, status: status || undefined, page, limit: 20 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => estimatesApi.delete(id),
    onSuccess: () => {
      toast.success('Estimate deleted');
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
    onError: () => toast.error('Failed to delete estimate'),
  });

  const handleDownload = async (est: any) => {
    setDownloading(est._id);
    try {
      await estimatesApi.downloadPDF(est._id, est.estimate_number);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Could not generate PDF');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this estimate?')) return;
    deleteMutation.mutate(id);
  };

  const estimates = data?.data || [];
  const total     = data?.total || 0;
  const pages     = data?.pages || 1;

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-['Outfit'] flex items-center gap-2">
            <ClipboardList size={22} className="text-blue-600" />
            Estimates / Quotations
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} quotation{total !== 1 ? 's' : ''} total</p>
        </div>
        <button
          id="new-estimate-btn"
          onClick={() => navigate('/estimates/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> New Estimate
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="estimate-search"
            className="input-field pl-9"
            placeholder="Search by client or quotation no…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          id="estimate-status-filter"
          className="input-field w-auto"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading estimates…</p>
          </div>
        ) : estimates.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No estimates found</p>
            <p className="text-gray-400 text-sm mt-1">Create your first quotation to get started</p>
            <button
              onClick={() => navigate('/estimates/new')}
              className="btn-primary mt-4 mx-auto"
            >
              <Plus size={14} /> Create Estimate
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left p-4 text-xs text-gray-500 font-semibold">Quotation No.</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-semibold">Client</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-semibold">Date</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-semibold">GST Type</th>
                    <th className="text-right p-4 text-xs text-gray-500 font-semibold">Amount</th>
                    <th className="text-center p-4 text-xs text-gray-500 font-semibold">Status</th>
                    <th className="text-right p-4 text-xs text-gray-500 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map((est: any) => (
                    <tr key={est._id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="p-4">
                        <span className="font-mono text-blue-700 font-semibold text-xs bg-blue-50 px-2 py-1 rounded-lg">
                          {est.estimate_number}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-800">{est.client_name}</div>
                        {est.client_phone && <div className="text-xs text-gray-400 mt-0.5">{est.client_phone}</div>}
                      </td>
                      <td className="p-4 text-gray-600 text-xs">{formatDate(est.estimate_date)}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          est.gst_type === 'CGST_SGST' ? 'bg-purple-100 text-purple-700' :
                          est.gst_type === 'IGST'      ? 'bg-orange-100 text-orange-700' :
                                                          'bg-gray-100 text-gray-600'
                        }`}>
                          {est.gst_type === 'CGST_SGST' ? 'CGST+SGST' : est.gst_type === 'IGST' ? 'IGST' : 'No GST'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-gray-800">
                        {formatCurrency(est.grand_total)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[est.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[est.status] || est.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            id={`view-est-${est._id}`}
                            onClick={() => navigate(`/estimates/${est._id}`)}
                            title="View"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            id={`dl-est-${est._id}`}
                            onClick={() => handleDownload(est)}
                            title="Download PDF"
                            disabled={downloading === est._id}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            {downloading === est._id
                              ? <span className="w-3.5 h-3.5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin block" />
                              : <Download size={15} />
                            }
                          </button>
                          <button
                            id={`del-est-${est._id}`}
                            onClick={() => handleDelete(est._id)}
                            title="Delete"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {estimates.map((est: any) => (
                <div key={est._id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-blue-700 font-semibold text-xs bg-blue-50 px-2 py-1 rounded-lg">
                        {est.estimate_number}
                      </span>
                      <div className="font-medium text-gray-800 mt-1">{est.client_name}</div>
                      <div className="text-xs text-gray-400">{formatDate(est.estimate_date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-800">{formatCurrency(est.grand_total)}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${STATUS_COLORS[est.status]}`}>
                        {STATUS_LABELS[est.status]}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => navigate(`/estimates/${est._id}`)} className="btn-outline text-xs py-1 px-3 flex-1 justify-center flex items-center gap-1">
                      <Eye size={12} /> View
                    </button>
                    <button onClick={() => handleDownload(est)} disabled={downloading === est._id} className="btn-primary text-xs py-1 px-3 flex-1 justify-center flex items-center gap-1">
                      <Download size={12} /> PDF
                    </button>
                    <button onClick={() => handleDelete(est._id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="p-4 flex items-center justify-center gap-2 border-t border-gray-100">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-outline text-xs py-1.5 px-3 disabled:opacity-40">← Prev</button>
                <span className="text-xs text-gray-500">Page {page} of {pages}</span>
                <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="btn-outline text-xs py-1.5 px-3 disabled:opacity-40">Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
