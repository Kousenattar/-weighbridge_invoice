import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoicesApi, clientsApi, settingsApi } from '../api';
import { calculateGST, numberToWords, getStateFromGST, INDIAN_STATES, formatCurrency } from '../utils';
import { Plus, Trash2, Search, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Client, CompanySettings } from '../types';
import { useAuth } from '../context/AuthContext';

const itemSchema = z.object({
  item_name: z.string().min(1, 'Required'),
  hsn_code: z.string().optional(),
  quantity: z.coerce.number().min(0.01, 'Must be > 0'),
  rate: z.coerce.number().min(0, 'Must be >= 0'),
});

const invoiceSchema = z.object({
  invoice_type: z.enum(['GST', 'NON_GST']),
  gst_type: z.enum(['CGST_SGST', 'IGST', 'NONE']).optional(),
  client_id: z.string().optional(),
  gst_number: z.string().optional(),
  client_name: z.string().min(1, 'Client name required'),
  client_address: z.string().optional(),
  client_state: z.string().optional(),
  client_state_code: z.string().optional(),
  invoice_date: z.string().min(1, 'Date required'),
  cgst_rate: z.coerce.number().default(9),
  sgst_rate: z.coerce.number().default(9),
  igst_rate: z.coerce.number().default(18),
  eway_bill: z.string().optional(),
  items: z.array(itemSchema).min(1, 'At least one item required'),
});

type FormData = z.infer<typeof invoiceSchema>;

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isGSTPanel } = useAuth();

  // Non-GST panel always creates NON_GST invoices; skip the type-selection screen
  const initType = isGSTPanel
    ? ((searchParams.get('type') as 'GST' | 'NON_GST') || 'GST')
    : 'NON_GST';

  const [step, setStep] = useState<'type' | 'form'>(
    !isGSTPanel || searchParams.get('type') ? 'form' : 'type'
  );
  const [gstLookup, setGstLookup] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [gstExtra, setGstExtra] = useState<{
    dty: string; ctb: string; rgdt: string; stj: string;
    nba: string[]; einvoiceStatus: string; source: string; status: string;
  } | null>(null);

  const { data: settingsData } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const company: CompanySettings = settingsData?.data;

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      invoice_type: initType,
      gst_type: 'CGST_SGST',
      invoice_date: new Date().toISOString().split('T')[0],
      cgst_rate: 9, sgst_rate: 9, igst_rate: 18,
      items: [{ item_name: '', hsn_code: '', quantity: 1, rate: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');
  const watchedType = watch('invoice_type');
  const watchedGstType = watch('gst_type');
  const cgstRate = watch('cgst_rate');
  const sgstRate = watch('sgst_rate');
  const igstRate = watch('igst_rate');

  const subtotal = watchedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
  const gstCalc = calculateGST(subtotal, watchedType, watchedGstType || 'NONE', cgstRate, sgstRate, igstRate);

  const createMutation = useMutation({
    mutationFn: (data: any) => invoicesApi.create(data),
    onSuccess: (res) => {
      toast.success(`Invoice ${res.data.invoice_number} created!`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/invoices/${res.data._id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create invoice'),
  });

  const handleGSTLookup = async () => {
    if (!gstLookup || gstLookup.length < 15) { toast.error('Enter valid 15-digit GST number'); return; }
    setLookingUp(true);
    setGstExtra(null);
    try {
      const res = await clientsApi.lookupGST(gstLookup);
      const d = res.data;
      const extra = res.extra || {};
      const source: string = res.source || 'api';

      // Fill form fields
      setValue('gst_number', d.gst_number || gstLookup.toUpperCase());
      setValue('client_name', d.client_name || d.trade_name || '');
      setValue('client_address', d.address || '');
      setValue('client_state', d.state || '');
      setValue('client_state_code', d.state_code || '');
      setValue('client_id', d._id || '');

      // Auto-select GST type: same state → CGST+SGST, different → IGST
      const companyState = company?.state || 'Maharashtra';
      setValue('gst_type', d.state === companyState ? 'CGST_SGST' : 'IGST');

      // Store extra API info to display in UI card
      setGstExtra({
        dty: extra.dty || '',
        ctb: extra.ctb || '',
        rgdt: extra.rgdt || '',
        stj: extra.stj || '',
        nba: extra.nba || [],
        einvoiceStatus: extra.einvoiceStatus || '',
        source,
        status: d.gst_status || '',
      });

      if (source === 'local') {
        toast.success('✅ Client loaded from local database');
      } else {
        toast.success(`✅ GST verified — ${d.gst_status || 'Active'}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'GST lookup failed';
      toast.error(msg);
    } finally {
      setLookingUp(false);
    }
  };

  const handleClientSearch = async (q: string) => {
    if (!q || q.length < 2) { setClientSuggestions([]); return; }
    const res = await clientsApi.getAll({ search: q, limit: 5 });
    setClientSuggestions(res.data || []);
    setShowSuggestions(true);
  };

  const selectClient = (c: Client) => {
    setValue('client_id', c._id);
    setValue('client_name', c.client_name);
    setValue('client_address', c.address || '');
    setValue('client_state', c.state || '');
    setValue('client_state_code', c.state_code || '');
    setValue('gst_number', c.gst_number || '');
    setShowSuggestions(false);
    if (c.state === (company?.state || 'Maharashtra')) setValue('gst_type', 'CGST_SGST');
    else if (c.state) setValue('gst_type', 'IGST');
  };

  const onSubmit = async (data: FormData) => {
    let clientId = data.client_id;
    if (!clientId) {
      try {
        const res = await clientsApi.create({
          client_name: data.client_name,
          gst_number: data.gst_number?.toUpperCase() || undefined,
          address: data.client_address,
          state: data.client_state,
          state_code: data.client_state_code,
          is_gst_registered: data.invoice_type === 'GST',
        });
        clientId = res.data._id;
      } catch (e: any) {
        if (e?.response?.data?.message?.includes('already exists')) {
          const res = await clientsApi.getAll({ search: data.gst_number });
          clientId = res.data[0]?._id;
        }
      }
    }
    createMutation.mutate({
      invoice_type: data.invoice_type,
      gst_type: data.invoice_type === 'GST' ? data.gst_type : 'NONE',
      client_id: clientId,
      invoice_date: data.invoice_date,
      items: data.items,
      cgst_rate: data.cgst_rate,
      sgst_rate: data.sgst_rate,
      igst_rate: data.igst_rate,
      eway_bill: data.eway_bill,
    });
  };

  // Type selection screen — shown only for GST panel, and only shows GST Invoice card
  if (step === 'type') {
    return (
      <div className="max-w-2xl mx-auto fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 font-['Outfit']">Create New Invoice</h1>
          <p className="text-gray-500 mt-1">Choose the invoice type to proceed</p>
        </div>
        <div className="flex justify-center">
          <button
            onClick={() => { setValue('invoice_type', 'GST'); setStep('form'); }}
            className="card p-8 text-center hover:scale-105 transition-all cursor-pointer border-2 border-transparent hover:border-blue-300 max-w-xs w-full"
          >
            <div className="text-5xl mb-4">🧾</div>
            <div className="text-xl font-bold text-gray-800 mb-2">GST Invoice</div>
            <div className="text-gray-500 text-sm">With CGST+SGST or IGST tax</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl mx-auto space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-['Outfit']">
            {watchedType === 'GST' ? 'GST Invoice' : 'Non-GST Invoice'}
          </h1>
          {isGSTPanel && (
            <button type="button" onClick={() => setStep('type')} className="text-blue-600 text-sm hover:underline mt-1">
              ← Change type
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/invoices')} className="btn-outline">Cancel</button>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Client + Items */}
        <div className="lg:col-span-2 space-y-5">
          {/* GST Type selector */}
          {watchedType === 'GST' && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-700 mb-3">GST Type</h3>
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

          {/* Client Details */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Client Details</h3>
            {watchedType === 'GST' && (
              <div className="mb-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    className="input-field font-mono uppercase tracking-wider"
                    placeholder="Enter GST Number (15 digits)"
                    value={gstLookup}
                    onChange={e => { setGstLookup(e.target.value.toUpperCase()); setGstExtra(null); }}
                    maxLength={15}
                  />
                  <button type="button" onClick={handleGSTLookup} disabled={lookingUp} className="btn-primary whitespace-nowrap">
                    {lookingUp
                      ? <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Fetching...</span>
                      : <><Search size={14} /> Lookup GST</>}
                  </button>
                </div>

                {/* GST Info Card — shown after successful API lookup */}
                {gstExtra && (
                  <div className={`rounded-xl border p-4 text-xs space-y-2 slide-in ${
                    gstExtra.status === 'Active'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}>
                    {/* Status banner */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          gstExtra.status === 'Active' ? 'bg-green-500' : 'bg-amber-500'
                        }`}></span>
                        <span className={`font-bold text-sm ${
                          gstExtra.status === 'Active' ? 'text-green-700' : 'text-amber-700'
                        }`}>
                          GST Status: {gstExtra.status || 'Unknown'}
                        </span>
                      </div>
                      <span className={`badge ${
                        gstExtra.source === 'local' ? 'badge-gst' : 'badge-paid'
                      }`}>
                        {gstExtra.source === 'local' ? '📂 Local DB' : '🌐 Live API'}
                      </span>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-gray-600">
                      {gstExtra.dty && (
                        <><span className="font-semibold text-gray-500">Taxpayer Type</span><span>{gstExtra.dty}</span></>
                      )}
                      {gstExtra.ctb && (
                        <><span className="font-semibold text-gray-500">Constitution</span><span>{gstExtra.ctb}</span></>
                      )}
                      {gstExtra.rgdt && (
                        <><span className="font-semibold text-gray-500">Reg. Date</span><span>{gstExtra.rgdt}</span></>
                      )}
                      {gstExtra.einvoiceStatus && (
                        <><span className="font-semibold text-gray-500">e-Invoice</span><span>{gstExtra.einvoiceStatus}</span></>
                      )}
                    </div>

                    {gstExtra.stj && (
                      <div className="pt-1">
                        <span className="font-semibold text-gray-500">Jurisdiction: </span>
                        <span className="text-gray-600">{gstExtra.stj}</span>
                      </div>
                    )}

                    {gstExtra.nba.length > 0 && (
                      <div className="pt-1">
                        <span className="font-semibold text-gray-500">Business Activities: </span>
                        <span className="text-gray-600">{gstExtra.nba.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="relative mb-3">
              <input className="input-field" placeholder="Search or enter client name..."
                {...register('client_name')}
                onChange={e => { register('client_name').onChange(e); handleClientSearch(e.target.value); }} />
              {showSuggestions && clientSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                  {clientSuggestions.map(c => (
                    <button key={c._id} type="button" onClick={() => selectClient(c)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors">
                      <div className="font-medium text-gray-800 text-sm">{c.client_name}</div>
                      <div className="text-xs text-gray-400">{c.gst_number} — {c.state}</div>
                    </button>
                  ))}
                </div>
              )}
              {errors.client_name && <p className="text-red-500 text-xs mt-1">{errors.client_name.message}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Address</label>
                <textarea className="input-field" rows={2} placeholder="Client address..." {...register('client_address')} />
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
                <input className="input-field" placeholder="e.g. 27" {...register('client_state_code')} />
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
                    const amt = qty * rate;
                    return (
                      <tr key={field.id} className="border-t border-gray-100">
                        <td className="p-2 text-gray-400">{idx + 1}</td>
                        <td className="p-1">
                          <textarea
                            className="input-field text-sm"
                            rows={4}
                            style={{ minHeight: '80px', resize: 'vertical' }}
                            placeholder="Enter item name / description..."
                            {...register(`items.${idx}.item_name`)}
                          />
                          {errors.items?.[idx]?.item_name && <p className="text-red-500 text-xs">{errors.items[idx]?.item_name?.message}</p>}
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
                        <td className="p-2 text-right font-semibold text-gray-700">{formatCurrency(amt)}</td>
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

        {/* Right: Summary */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Invoice Details</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Invoice Date *</label>
              <input type="date" className="input-field" {...register('invoice_date')} />
              {errors.invoice_date && <p className="text-red-500 text-xs mt-1">{errors.invoice_date.message}</p>}
            </div>
          </div>

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

          {/* Calculation Summary */}
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

          <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full justify-center py-3 text-base">
            {createMutation.isPending ? 'Creating Invoice...' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </form>
  );
}
