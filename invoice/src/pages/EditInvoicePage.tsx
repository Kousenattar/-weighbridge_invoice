import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoicesApi, clientsApi, settingsApi } from '../api';
import { calculateGST, numberToWords, INDIAN_STATES, formatCurrency } from '../utils';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CompanySettings } from '../types';

const itemSchema = z.object({
  item_name: z.string().min(1, 'Required'),
  hsn_code: z.string().optional(),
  quantity: z.coerce.number().min(0.01, 'Must be > 0'),
  rate: z.coerce.number().min(0, 'Must be >= 0'),
});

const schema = z.object({
  invoice_type: z.enum(['GST', 'NON_GST']),
  gst_type: z.enum(['CGST_SGST', 'IGST', 'NONE']).optional(),
  client_name: z.string().min(1, 'Required'),
  client_address: z.string().optional(),
  client_state: z.string().optional(),
  client_state_code: z.string().optional(),
  gst_number: z.string().optional(),
  invoice_date: z.string().min(1, 'Required'),
  cgst_rate: z.coerce.number().default(9),
  sgst_rate: z.coerce.number().default(9),
  igst_rate: z.coerce.number().default(18),
  eway_bill: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent', 'paid', 'cancelled']).default('draft'),
  items: z.array(itemSchema).min(1, 'At least one item required'),
});

type FormData = z.infer<typeof schema>;

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: invData, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getById(id!),
  });
  const { data: settingsData } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const company: CompanySettings = settingsData?.data;

  const invoice = invData?.data;

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoice_type: 'GST',
      gst_type: 'CGST_SGST',
      invoice_date: new Date().toISOString().split('T')[0],
      cgst_rate: 9, sgst_rate: 9, igst_rate: 18,
      status: 'draft',
      items: [{ item_name: '', hsn_code: '', quantity: 1, rate: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Populate form once invoice is loaded
  useEffect(() => {
    if (!invoice) return;
    reset({
      invoice_type: invoice.invoice_type,
      gst_type: invoice.gst_type || 'NONE',
      client_name: invoice.client?.client_name || '',
      client_address: invoice.client?.address || '',
      client_state: invoice.client?.state || '',
      client_state_code: invoice.client?.state_code || '',
      gst_number: invoice.client?.gst_number || '',
      invoice_date: new Date(invoice.invoice_date).toISOString().split('T')[0],
      cgst_rate: invoice.cgst_rate || 9,
      sgst_rate: invoice.sgst_rate || 9,
      igst_rate: invoice.igst_rate || 18,
      eway_bill: invoice.eway_bill || '',
      notes: invoice.notes || '',
      status: invoice.status || 'draft',
      items: invoice.items.map((item: any) => ({
        item_name: item.item_name,
        hsn_code: item.hsn_code || '',
        quantity: item.quantity,
        rate: item.rate,
      })),
    });
  }, [invoice, reset]);

  const watchedItems = watch('items');
  const watchedType = watch('invoice_type');
  const watchedGstType = watch('gst_type');
  const cgstRate = watch('cgst_rate');
  const sgstRate = watch('sgst_rate');
  const igstRate = watch('igst_rate');

  const subtotal = watchedItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
  const gstCalc = calculateGST(subtotal, watchedType, watchedGstType || 'NONE', cgstRate, sgstRate, igstRate);

  const updateMutation = useMutation({
    mutationFn: (data: any) => invoicesApi.update(id!, data),
    onSuccess: (res) => {
      toast.success('Invoice updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/invoices/${id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update invoice'),
  });

  const onSubmit = async (data: FormData) => {
    // Update client details too
    if (invoice?.client?._id) {
      try {
        await clientsApi.update(invoice.client._id, {
          client_name: data.client_name,
          address: data.client_address,
          state: data.client_state,
          state_code: data.client_state_code,
          gst_number: data.gst_number?.toUpperCase() || undefined,
        });
      } catch { /* non-critical */ }
    }

    updateMutation.mutate({
      invoice_type: data.invoice_type,
      gst_type: data.invoice_type === 'GST' ? data.gst_type : 'NONE',
      client_id: invoice?.client?._id,
      invoice_date: data.invoice_date,
      items: data.items,
      cgst_rate: data.cgst_rate,
      sgst_rate: data.sgst_rate,
      igst_rate: data.igst_rate,
      eway_bill: data.eway_bill,
      notes: data.notes,
      status: data.status,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 fade-in">
        {[1, 2, 3].map(i => <div key={i} className="card h-32 skeleton"></div>)}
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="card p-8 text-center text-gray-500">
        Invoice not found.{' '}
        <button onClick={() => navigate('/invoices')} className="text-blue-600 underline">Go back</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl mx-auto space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(`/invoices/${id}`)} className="btn-outline p-2">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 font-['Outfit']">
              Edit Invoice — <span className="text-blue-700">{invoice.invoice_number}</span>
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Modify invoice details below</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(`/invoices/${id}`)} className="btn-outline">
            Cancel
          </button>
          <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
            <Save size={15} />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main Details */}
        <div className="lg:col-span-2 space-y-5">

          {/* Invoice Type + GST Type */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Invoice Type</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[{ v: 'GST', l: '🧾 GST Invoice' }, { v: 'NON_GST', l: '📄 Non-GST Invoice' }].map(({ v, l }) => (
                <label key={v} className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${watchedType === v ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                  <input type="radio" value={v} {...register('invoice_type')} className="accent-blue-600" />
                  <span className="text-sm font-medium text-gray-700">{l}</span>
                </label>
              ))}
            </div>

            {watchedType === 'GST' && (
              <div>
                <label className="text-xs text-gray-500 mb-2 block font-medium">GST Type</label>
                <div className="flex gap-3">
                  {[{ v: 'CGST_SGST', l: 'CGST + SGST (Intra-State)' }, { v: 'IGST', l: 'IGST (Inter-State)' }].map(({ v, l }) => (
                    <label key={v} className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${watchedGstType === v ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                      <input type="radio" value={v} {...register('gst_type')} className="accent-blue-600" />
                      <span className="text-sm font-medium text-gray-700">{l}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Client Details */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Client Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Client Name *</label>
                <input className="input-field" {...register('client_name')} />
                {errors.client_name && <p className="text-red-500 text-xs mt-1">{errors.client_name.message}</p>}
              </div>
              {watchedType === 'GST' && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">GST Number</label>
                  <input className="input-field font-mono uppercase" {...register('gst_number')} />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Address</label>
                <textarea className="input-field" rows={2} {...register('client_address')} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">State</label>
                <select className="input-field" {...register('client_state')}
                  onChange={e => {
                    register('client_state').onChange(e);
                    const found = INDIAN_STATES.find(s => s.name === e.target.value);
                    if (found) {
                      setValue('client_state_code', found.code);
                      setValue('gst_type', found.name === (company?.state || 'Maharashtra') ? 'CGST_SGST' : 'IGST');
                    }
                  }}>
                  <option value="">Select State</option>
                  {INDIAN_STATES.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">State Code</label>
                <input className="input-field" {...register('client_state_code')} />
              </div>
              {watchedType === 'GST' && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">E-Way Bill No.</label>
                  <input className="input-field" placeholder="Optional" {...register('eway_bill')} />
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
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
                        <td className="p-2 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="p-1">
                          <textarea
                            className="input-field text-sm"
                            rows={4}
                            style={{ minHeight: '80px', resize: 'vertical' }}
                            placeholder="Enter item name / description..."
                            {...register(`items.${idx}.item_name`)}
                          />
                          {errors.items?.[idx]?.item_name && (
                            <p className="text-red-500 text-xs">{errors.items[idx]?.item_name?.message}</p>
                          )}
                        </td>
                        <td className="p-1">
                          <input className="input-field text-xs" placeholder="8423" {...register(`items.${idx}.hsn_code`)} />
                        </td>
                        <td className="p-1">
                          <input type="number" className="input-field text-xs text-right" min="0" step="0.01"
                            {...register(`items.${idx}.quantity`)} />
                        </td>
                        <td className="p-1">
                          <input type="number" className="input-field text-xs text-right" min="0" step="0.01"
                            {...register(`items.${idx}.rate`)} />
                        </td>
                        <td className="p-2 text-right font-semibold text-gray-700 text-xs">
                          {formatCurrency(qty * rate)}
                        </td>
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
              {errors.items && !Array.isArray(errors.items) && (
                <p className="text-red-500 text-xs mt-2">{(errors.items as any).message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-5">
          {/* Invoice Details */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Invoice Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Invoice Date *</label>
                <input type="date" className="input-field" {...register('invoice_date')} />
                {errors.invoice_date && <p className="text-red-500 text-xs mt-1">{errors.invoice_date.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select className="input-field" {...register('status')}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* GST Rates */}
          {watchedType === 'GST' && (
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

          {/* Live Summary */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {watchedType === 'GST' && watchedGstType === 'CGST_SGST' && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>CGST ({cgstRate}%)</span>
                    <span>{formatCurrency(gstCalc.cgst_amount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>SGST ({sgstRate}%)</span>
                    <span>{formatCurrency(gstCalc.sgst_amount)}</span>
                  </div>
                </>
              )}
              {watchedType === 'GST' && watchedGstType === 'IGST' && (
                <div className="flex justify-between text-gray-600">
                  <span>IGST ({igstRate}%)</span>
                  <span>{formatCurrency(gstCalc.igst_amount)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-800 text-base">
                <span>Grand Total</span>
                <span className="text-blue-700">{formatCurrency(gstCalc.grand_total)}</span>
              </div>
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700 font-medium italic">{numberToWords(gstCalc.grand_total)}</p>
            </div>
          </div>

          <button type="submit" disabled={updateMutation.isPending} className="btn-primary w-full justify-center py-3 text-base">
            <Save size={15} />
            {updateMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
