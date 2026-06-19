import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { purchasesApi } from '../api';
import { formatCurrency, INDIAN_STATES } from '../utils';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const itemSchema = z.object({
  item_name: z.string().min(1, 'Required'),
  hsn_code:  z.string().optional(),
  quantity:  z.coerce.number().min(0.01, 'Must be > 0'),
  rate:      z.coerce.number().min(0, 'Must be >= 0'),
});

const purchaseSchema = z.object({
  bill_no:             z.string().min(1, 'Bill number required'),
  purchase_date:       z.string().min(1, 'Date required'),
  supplier_name:       z.string().min(1, 'Supplier name required'),
  supplier_address:    z.string().optional(),
  supplier_gst:        z.string().optional(),
  supplier_state:      z.string().optional(),
  supplier_state_code: z.string().optional(),
  gst_type:            z.enum(['CGST_SGST', 'IGST', 'NONE']),
  cgst_rate:           z.coerce.number().default(9),
  sgst_rate:           z.coerce.number().default(9),
  igst_rate:           z.coerce.number().default(18),
  notes:               z.string().optional(),
  items:               z.array(itemSchema).min(1, 'At least one item required'),
});

type FormData = z.infer<typeof purchaseSchema>;

export default function EditPurchasePage() {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => purchasesApi.getById(id!),
    enabled: !!id,
  });

  const purchase = data?.data;

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<FormData>({
      resolver: zodResolver(purchaseSchema),
      defaultValues: {
        gst_type: 'NONE',
        cgst_rate: 9,
        sgst_rate: 9,
        igst_rate: 18,
        items: [{ item_name: '', hsn_code: '', quantity: 1, rate: 0 }],
      },
    });

  // Populate form when data loads
  React.useEffect(() => {
    if (purchase) {
      reset({
        bill_no:             purchase.bill_no,
        purchase_date:       purchase.purchase_date?.split('T')[0] || '',
        supplier_name:       purchase.supplier_name,
        supplier_address:    purchase.supplier_address || '',
        supplier_gst:        purchase.supplier_gst     || '',
        supplier_state:      purchase.supplier_state   || '',
        supplier_state_code: purchase.supplier_state_code || '',
        gst_type:            purchase.gst_type,
        cgst_rate:           purchase.cgst_rate,
        sgst_rate:           purchase.sgst_rate,
        igst_rate:           purchase.igst_rate,
        notes:               purchase.notes || '',
        items:               purchase.items.map((i: any) => ({
          item_name: i.item_name,
          hsn_code:  i.hsn_code || '',
          quantity:  i.quantity,
          rate:      i.rate,
        })),
      });
    }
  }, [purchase, reset]);

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedItems   = watch('items');
  const watchedGstType = watch('gst_type');
  const cgstRate       = watch('cgst_rate');
  const sgstRate       = watch('sgst_rate');
  const igstRate       = watch('igst_rate');

  const subtotal   = watchedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
  const cgstAmt    = watchedGstType === 'CGST_SGST' ? (subtotal * (cgstRate || 0)) / 100 : 0;
  const sgstAmt    = watchedGstType === 'CGST_SGST' ? (subtotal * (sgstRate || 0)) / 100 : 0;
  const igstAmt    = watchedGstType === 'IGST'      ? (subtotal * (igstRate || 0)) / 100 : 0;
  const totalGst   = cgstAmt + sgstAmt + igstAmt;
  const grandTotal = subtotal + totalGst;

  const updateMutation = useMutation({
    mutationFn: (formData: any) => purchasesApi.update(id!, formData),
    onSuccess: () => {
      toast.success('Purchase updated!');
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchase', id] });
      navigate(`/purchases/${id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update purchase'),
  });

  const onSubmit = (data: FormData) => {
    updateMutation.mutate({ ...data, supplier_gst: data.supplier_gst?.toUpperCase() || '' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl mx-auto space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-['Outfit']">Edit Purchase</h1>
          <p className="text-gray-500 text-sm mt-1">Bill No: {purchase?.bill_no}</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(`/purchases/${id}`)} className="btn-outline flex items-center gap-2">
            <ArrowLeft size={15} /> Cancel
          </button>
          <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
            {updateMutation.isPending ? 'Saving...' : 'Update Purchase'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Bill Info */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Bill Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Bill Number *</label>
                <input className="input-field" {...register('bill_no')} />
                {errors.bill_no && <p className="text-red-500 text-xs mt-1">{errors.bill_no.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Purchase Date *</label>
                <input type="date" className="input-field" {...register('purchase_date')} />
              </div>
            </div>
          </div>

          {/* Supplier Details */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Supplier Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Supplier Name *</label>
                <input className="input-field" {...register('supplier_name')} />
                {errors.supplier_name && <p className="text-red-500 text-xs mt-1">{errors.supplier_name.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Address</label>
                <textarea className="input-field" rows={2} {...register('supplier_address')} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">GST Number</label>
                  <input className="input-field font-mono uppercase tracking-wider" maxLength={15}
                    {...register('supplier_gst')}
                    onChange={e => setValue('supplier_gst', e.target.value.toUpperCase())} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">State</label>
                  <select className="input-field" {...register('supplier_state')}
                    onChange={e => {
                      register('supplier_state').onChange(e);
                      const found = INDIAN_STATES.find(s => s.name === e.target.value);
                      if (found) setValue('supplier_state_code', found.code);
                    }}>
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">State Code</label>
                  <input className="input-field" {...register('supplier_state_code')} />
                </div>
              </div>
            </div>
          </div>

          {/* GST Type */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-3">GST Type</h3>
            <div className="flex gap-3 flex-wrap">
              {[
                { v: 'NONE', l: 'No GST', emoji: '🚫' },
                { v: 'CGST_SGST', l: 'CGST + SGST', emoji: '📍' },
                { v: 'IGST', l: 'IGST', emoji: '🔁' },
              ].map(({ v, l, emoji }) => (
                <label key={v} className={`flex-1 min-w-[130px] flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  watchedGstType === v ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                  <input type="radio" value={v} {...register('gst_type')} className="accent-blue-600" />
                  <span className="text-sm font-medium text-gray-700">{emoji} {l}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">Items</h3>
              <button type="button" onClick={() => append({ item_name: '', hsn_code: '', quantity: 1, rate: 0 })}
                className="btn-primary text-xs py-1.5 px-3">
                <Plus size={13} /> Add Item
              </button>
            </div>
            <div className="items-scroll-table">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2 text-xs text-gray-500 font-semibold w-8">#</th>
                    <th className="text-left p-2 text-xs text-gray-500 font-semibold" style={{ minWidth: '200px' }}>Item Description *</th>
                    <th className="text-left p-2 text-xs text-gray-500 font-semibold w-24">HSN Code</th>
                    <th className="text-right p-2 text-xs text-gray-500 font-semibold w-20">Qty *</th>
                    <th className="text-right p-2 text-xs text-gray-500 font-semibold w-28">Rate *</th>
                    <th className="text-right p-2 text-xs text-gray-500 font-semibold w-28">Amount</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => {
                    const qty = Number(watchedItems[idx]?.quantity) || 0;
                    const rate = Number(watchedItems[idx]?.rate) || 0;
                    return (
                      <tr key={field.id} className="border-t border-gray-100">
                        <td className="p-2 text-gray-400">{idx + 1}</td>
                        <td className="p-1">
                          <textarea className="input-field text-sm" rows={3}
                            style={{ minHeight: '72px', resize: 'vertical' }}
                            {...register(`items.${idx}.item_name`)} />
                        </td>
                        <td className="p-1">
                          <input className="input-field text-xs" {...register(`items.${idx}.hsn_code`)} />
                        </td>
                        <td className="p-1">
                          <input type="number" className="input-field text-xs text-right" min="0" step="0.01"
                            {...register(`items.${idx}.quantity`)} />
                        </td>
                        <td className="p-1">
                          <input type="number" className="input-field text-xs text-right" min="0" step="0.01"
                            {...register(`items.${idx}.rate`)} />
                        </td>
                        <td className="p-2 text-right font-semibold text-gray-700">{formatCurrency(qty * rate)}</td>
                        <td className="p-1">
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(idx)}
                              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Notes</h3>
            <textarea className="input-field" rows={3} {...register('notes')} />
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-5">
          {watchedGstType !== 'NONE' && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-700 mb-3">GST Rates</h3>
              {watchedGstType === 'CGST_SGST' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">CGST Rate (%)</label>
                    <input type="number" className="input-field" step="0.01" {...register('cgst_rate')} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">SGST Rate (%)</label>
                    <input type="number" className="input-field" step="0.01" {...register('sgst_rate')} />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">IGST Rate (%)</label>
                  <input type="number" className="input-field" step="0.01" {...register('igst_rate')} />
                </div>
              )}
            </div>
          )}

          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {watchedGstType === 'CGST_SGST' && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>CGST ({cgstRate}%)</span>
                    <span>{formatCurrency(cgstAmt)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>SGST ({sgstRate}%)</span>
                    <span>{formatCurrency(sgstAmt)}</span>
                  </div>
                </>
              )}
              {watchedGstType === 'IGST' && (
                <div className="flex justify-between text-gray-600">
                  <span>IGST ({igstRate}%)</span>
                  <span>{formatCurrency(igstAmt)}</span>
                </div>
              )}
              {totalGst > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Total GST</span>
                  <span>{formatCurrency(totalGst)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-800 text-base">
                <span>Grand Total</span>
                <span className="text-blue-700">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          <button type="submit" disabled={updateMutation.isPending} className="btn-primary w-full justify-center py-3 text-base">
            {updateMutation.isPending ? 'Updating...' : '💾 Update Purchase'}
          </button>
        </div>
      </div>
    </form>
  );
}
