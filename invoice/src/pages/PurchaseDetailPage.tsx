import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi } from '../api';
import { formatCurrency } from '../utils';
import { ArrowLeft, Pencil, Trash2, Calendar, Building2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Purchase } from '../types';

export default function PurchaseDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchase', id],
    queryFn:  () => purchasesApi.getById(id!),
    enabled:  !!id,
  });

  const purchase: Purchase | undefined = data?.data;

  const deleteMutation = useMutation({
    mutationFn: () => purchasesApi.delete(id!),
    onSuccess: () => {
      toast.success('Purchase deleted');
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      navigate('/purchases');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Delete failed'),
  });

  const handleDelete = () => {
    if (confirm('Delete this purchase record? This cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !purchase) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg font-medium">Purchase not found</p>
        <button onClick={() => navigate('/purchases')} className="btn-primary mt-4">Back to Purchases</button>
      </div>
    );
  }

  const gstLabel = purchase.gst_type === 'CGST_SGST' ? 'CGST + SGST' :
                   purchase.gst_type === 'IGST'      ? 'IGST'         : 'No GST';

  return (
    <div className="max-w-7xl mx-auto space-y-6 fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/purchases')} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline mb-2">
            <ArrowLeft size={14} /> Back to Purchases
          </button>
          <h1 className="text-2xl font-bold text-gray-800 font-['Outfit']">Purchase Detail</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate(`/purchases/${id}/edit`)} className="btn-outline flex items-center gap-2">
            <Pencil size={14} /> Edit
          </button>
          <button onClick={handleDelete} disabled={deleteMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-sm font-medium transition-all">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Meta */}
          <div className="card p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Tag size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Bill Number</p>
                  <p className="font-bold text-gray-800 text-sm mt-0.5">{purchase.bill_no}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Purchase Date</p>
                  <p className="font-bold text-gray-800 text-sm mt-0.5">
                    {new Date(purchase.purchase_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={16} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">GST Type</p>
                  <p className="font-bold text-gray-800 text-sm mt-0.5">{gstLabel}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Supplier Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Supplier Name</p>
                <p className="font-semibold text-gray-800">{purchase.supplier_name}</p>
              </div>
              {purchase.supplier_gst && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">GST Number</p>
                  <p className="font-mono text-gray-800 font-semibold">{purchase.supplier_gst}</p>
                </div>
              )}
              {purchase.supplier_state && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">State</p>
                  <p className="text-gray-800">{purchase.supplier_state} {purchase.supplier_state_code ? `(${purchase.supplier_state_code})` : ''}</p>
                </div>
              )}
              {purchase.supplier_address && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">Address</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{purchase.supplier_address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 text-xs text-gray-500 font-semibold">#</th>
                    <th className="text-left p-3 text-xs text-gray-500 font-semibold">Description</th>
                    <th className="text-left p-3 text-xs text-gray-500 font-semibold">HSN</th>
                    <th className="text-right p-3 text-xs text-gray-500 font-semibold">Qty</th>
                    <th className="text-right p-3 text-xs text-gray-500 font-semibold">Rate</th>
                    <th className="text-right p-3 text-xs text-gray-500 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.items.map((item, idx) => (
                    <tr key={idx} className="border-t border-gray-100">
                      <td className="p-3 text-gray-400">{item.sr_no}</td>
                      <td className="p-3 text-gray-700 whitespace-pre-wrap">{item.item_name}</td>
                      <td className="p-3 text-gray-500 font-mono text-xs">{item.hsn_code || '—'}</td>
                      <td className="p-3 text-right text-gray-700">{item.quantity}</td>
                      <td className="p-3 text-right text-gray-700">{formatCurrency(item.rate)}</td>
                      <td className="p-3 text-right font-semibold text-gray-800">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {purchase.notes && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-700 mb-2">Notes</h3>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{purchase.notes}</p>
            </div>
          )}
        </div>

        {/* ── Right: Totals ── */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">GST Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(purchase.subtotal)}</span>
              </div>
              {purchase.gst_type === 'CGST_SGST' && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>CGST ({purchase.cgst_rate}%)</span>
                    <span>{formatCurrency(purchase.cgst_amount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>SGST ({purchase.sgst_rate}%)</span>
                    <span>{formatCurrency(purchase.sgst_amount)}</span>
                  </div>
                </>
              )}
              {purchase.gst_type === 'IGST' && (
                <div className="flex justify-between text-gray-600">
                  <span>IGST ({purchase.igst_rate}%)</span>
                  <span>{formatCurrency(purchase.igst_amount)}</span>
                </div>
              )}
              {purchase.total_gst > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold pt-1">
                  <span>Total GST Paid</span>
                  <span>{formatCurrency(purchase.total_gst)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-800 text-base">
                <span>Grand Total</span>
                <span className="text-blue-700">{formatCurrency(purchase.grand_total)}</span>
              </div>
            </div>

            {purchase.total_gst > 0 && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-xs text-emerald-700 font-semibold">🔖 Input GST Credit</p>
                <p className="text-lg font-bold text-emerald-700 mt-1">{formatCurrency(purchase.total_gst)}</p>
                <p className="text-xs text-emerald-600 mt-0.5">Claimable as input tax credit</p>
              </div>
            )}
          </div>

          <div className="card p-4">
            <p className="text-xs text-gray-400">Recorded on</p>
            <p className="text-sm text-gray-600 font-medium mt-0.5">
              {new Date(purchase.createdAt).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
