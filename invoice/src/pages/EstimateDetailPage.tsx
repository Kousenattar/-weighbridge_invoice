import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { estimatesApi } from '../api';
import { formatCurrency } from '../utils';
import { ArrowLeft, Download, Trash2, ClipboardList, CheckCircle, XCircle, Send, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function EstimateDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['estimate', id],
    queryFn:  () => estimatesApi.getById(id!),
    enabled:  !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => estimatesApi.update(id!, { ...est, items: est.items, status }),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => estimatesApi.delete(id!),
    onSuccess: () => {
      toast.success('Estimate deleted');
      navigate('/estimates');
    },
  });

  const handleDownload = async () => {
    if (!est) return;
    setDownloading(true);
    try {
      await estimatesApi.downloadPDF(id!, est.estimate_number);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Could not generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = () => {
    if (!window.confirm('Delete this estimate?')) return;
    deleteMutation.mutate();
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading estimate…</p>
        </div>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Estimate not found.</p>
        <button onClick={() => navigate('/estimates')} className="btn-outline mt-4">← Back to Estimates</button>
      </div>
    );
  }

  const est = data.data;
  const isCGST = est.gst_type === 'CGST_SGST';
  const isIGST = est.gst_type === 'IGST';
  const isGST  = isCGST || isIGST;

  return (
    <div className="max-w-5xl mx-auto space-y-5 fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/estimates')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 font-['Outfit'] flex items-center gap-2">
              <ClipboardList size={20} className="text-blue-600" />
              {est.estimate_number}
            </h1>
            <p className="text-gray-500 text-sm">Dated {formatDate(est.estimate_date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${STATUS_COLORS[est.status]}`}>
            {est.status.charAt(0).toUpperCase() + est.status.slice(1)}
          </span>
          {est.status === 'draft' && (
            <button
              onClick={() => updateStatusMutation.mutate('sent')}
              disabled={updateStatusMutation.isPending}
              className="btn-outline text-xs flex items-center gap-1.5"
            >
              <Send size={12} /> Mark Sent
            </button>
          )}
          {est.status === 'sent' && (
            <>
              <button onClick={() => updateStatusMutation.mutate('accepted')} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600">
                <CheckCircle size={12} /> Accepted
              </button>
              <button onClick={() => updateStatusMutation.mutate('rejected')} className="btn-outline text-xs flex items-center gap-1.5 border-red-300 text-red-600 hover:bg-red-50">
                <XCircle size={12} /> Rejected
              </button>
            </>
          )}
          <button
            id="download-pdf-btn"
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary flex items-center gap-2"
          >
            {downloading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Download size={15} />
            }
            Download PDF
          </button>
          <button onClick={handleDelete} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Client + Items */}
        <div className="lg:col-span-2 space-y-5">

          {/* Client details */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Customer Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">M/S (Client Name)</p>
                <p className="font-semibold text-gray-800">{est.client_name}</p>
              </div>
              {est.client_phone && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                  <p className="font-medium text-gray-800">{est.client_phone}</p>
                </div>
              )}
              {est.client_address && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">Address</p>
                  <p className="text-gray-700 whitespace-pre-line">{est.client_address}</p>
                </div>
              )}
              {est.client_gst && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">GSTIN</p>
                  <p className="font-mono font-medium text-gray-800">{est.client_gst}</p>
                </div>
              )}
              {est.place_of_supply && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Place of Supply</p>
                  <p className="text-gray-700">{est.place_of_supply}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-center p-3 text-xs text-gray-500 font-semibold w-8">Sr.</th>
                    <th className="text-left p-3 text-xs text-gray-500 font-semibold">Name of Product / Service</th>
                    <th className="text-center p-3 text-xs text-gray-500 font-semibold w-16">HSN/SAC</th>
                    <th className="text-center p-3 text-xs text-gray-500 font-semibold w-12">Qty</th>
                    <th className="text-right p-3 text-xs text-gray-500 font-semibold w-20">Rate</th>
                    <th className="text-right p-3 text-xs text-gray-500 font-semibold w-24">Taxable</th>
                    {isCGST && <>
                      <th className="text-center p-3 text-xs text-gray-500 font-semibold w-20">CGST</th>
                      <th className="text-center p-3 text-xs text-gray-500 font-semibold w-20">SGST</th>
                    </>}
                    {isIGST && <th className="text-center p-3 text-xs text-gray-500 font-semibold w-20">IGST</th>}
                    <th className="text-right p-3 text-xs text-gray-500 font-semibold w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {est.items.map((item: any, idx: number) => (
                    <tr key={idx} className={`border-b border-gray-100 ${idx % 2 === 1 ? 'bg-blue-50/30' : ''}`}>
                      <td className="p-3 text-center text-gray-400 text-xs">{item.sr_no || idx + 1}</td>
                      <td className="p-3">
                        <p className="font-medium text-gray-800 text-sm whitespace-pre-line">{item.item_name}</p>
                      </td>
                      <td className="p-3 text-center text-xs text-gray-500">{item.hsn_code || '—'}</td>
                      <td className="p-3 text-center text-xs text-gray-700">{item.quantity}</td>
                      <td className="p-3 text-right text-xs text-gray-700">{formatCurrency(item.rate)}</td>
                      <td className="p-3 text-right text-xs text-gray-700">{formatCurrency(item.taxable_value)}</td>
                      {isCGST && <>
                        <td className="p-3 text-center text-xs">
                          <span className="block text-gray-600">{item.cgst_rate}%</span>
                          <span className="text-gray-500">{formatCurrency(item.cgst_amount)}</span>
                        </td>
                        <td className="p-3 text-center text-xs">
                          <span className="block text-gray-600">{item.sgst_rate}%</span>
                          <span className="text-gray-500">{formatCurrency(item.sgst_amount)}</span>
                        </td>
                      </>}
                      {isIGST && (
                        <td className="p-3 text-center text-xs">
                          <span className="block text-gray-600">{item.igst_rate}%</span>
                          <span className="text-gray-500">{formatCurrency(item.igst_amount)}</span>
                        </td>
                      )}
                      <td className="p-3 text-right font-bold text-gray-800">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {est.notes && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-700 mb-2">Notes / Terms</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{est.notes}</p>
            </div>
          )}
        </div>

        {/* Right: Summary */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Taxable Amount</span>
                <span className="font-medium">{formatCurrency(est.subtotal)}</span>
              </div>
              {isCGST && <>
                <div className="flex justify-between text-gray-600">
                  <span>CGST ({est.cgst_rate}%)</span>
                  <span>{formatCurrency(est.cgst_amount)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>SGST ({est.sgst_rate}%)</span>
                  <span>{formatCurrency(est.sgst_amount)}</span>
                </div>
              </>}
              {isIGST && (
                <div className="flex justify-between text-gray-600">
                  <span>IGST ({est.igst_rate}%)</span>
                  <span>{formatCurrency(est.igst_amount)}</span>
                </div>
              )}
              {isGST && (
                <div className="flex justify-between text-gray-600">
                  <span>Total Tax</span>
                  <span>{formatCurrency(est.total_tax)}</span>
                </div>
              )}
              {est.round_off !== 0 && (
                <div className="flex justify-between text-gray-400 text-xs">
                  <span>Round Off</span>
                  <span>{formatCurrency(est.round_off)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-800 text-base">
                <span>Grand Total</span>
                <span className="text-blue-700">{formatCurrency(est.grand_total)}</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-600 font-medium italic">{est.amount_in_words}</p>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Quotation Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Quotation No.</span>
                <span className="font-mono font-semibold text-blue-700">{est.estimate_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="text-gray-700">{formatDate(est.estimate_date)}</span>
              </div>
              {est.valid_until && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Valid Until</span>
                  <span className="text-gray-700">{formatDate(est.valid_until)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">GST Type</span>
                <span className="text-gray-700">
                  {est.gst_type === 'CGST_SGST' ? 'CGST + SGST' : est.gst_type === 'IGST' ? 'IGST' : 'No GST'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary w-full justify-center py-3 text-base flex items-center gap-2"
          >
            {downloading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Download size={16} />
            }
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
