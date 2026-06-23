import React, { useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi } from '../api';
import { formatCurrency, INDIAN_STATES } from '../utils';
import { Plus, Trash2, ArrowLeft, Upload, Sparkles, X, FileImage, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Schema ──────────────────────────────────────────────────────────────────

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

// ─── Upload Zone ─────────────────────────────────────────────────────────────

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

interface UploadZoneProps {
  onExtracted: (data: any) => void;
}

function UploadZone({ onExtracted }: UploadZoneProps) {
  const [state,     setState]     = useState<UploadState>('idle');
  const [preview,   setPreview]   = useState<string | null>(null);
  const [fileName,  setFileName]  = useState('');
  const [errMsg,    setErrMsg]    = useState('');
  const [dragOver,  setDragOver]  = useState(false);

  const processFile = useCallback(async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error('Please upload JPG, PNG, WEBP, or PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10 MB.');
      return;
    }

    setFileName(file.name);
    setErrMsg('');
    setState('uploading');

    // Preview for images
    if (file.type !== 'application/pdf') {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    try {
      const res = await purchasesApi.extractBill(file);
      if (res.success && res.data) {
        onExtracted(res.data);
        setState('done');
        toast.success('✅ Bill scanned! Form has been filled.');
      } else {
        throw new Error(res.message || 'Extraction failed');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Could not read bill';
      setErrMsg(msg);
      setState('error');
      toast.error(msg);
    }
  }, [onExtracted]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const reset = () => {
    setState('idle');
    setPreview(null);
    setFileName('');
    setErrMsg('');
  };

  // ── Idle drop zone ──
  if (state === 'idle') {
    return (
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all duration-200 cursor-pointer ${
          dragOver
            ? 'border-blue-400 bg-blue-50 scale-[1.01]'
            : 'border-gray-200 bg-gradient-to-br from-blue-50/40 to-purple-50/40 hover:border-blue-300 hover:bg-blue-50/60'
        }`}
        onClick={() => document.getElementById('bill-file-input')?.click()}
      >
        <input
          id="bill-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileInput}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 text-base">Upload Purchase Bill</p>
            <p className="text-sm text-gray-400 mt-1">AI will read the bill and fill the form automatically</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Upload size={14} className="text-blue-500" />
            <span className="text-sm font-medium text-blue-600">
              {dragOver ? 'Drop it here!' : 'Click to upload or drag & drop'}
            </span>
          </div>
          <p className="text-xs text-gray-400">Supports JPG · PNG · PDF &nbsp;·&nbsp; Max 10 MB</p>
        </div>
      </div>
    );
  }

  // ── Uploading ──
  if (state === 'uploading') {
    return (
      <div className="border-2 border-blue-200 bg-blue-50 rounded-2xl p-6 sm:p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="w-14 h-14 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
            <Sparkles size={18} className="absolute inset-0 m-auto text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-blue-700">AI is reading your bill…</p>
            <p className="text-sm text-blue-500 mt-1 truncate max-w-xs mx-auto">{fileName}</p>
            <p className="text-xs text-blue-400 mt-2">Extracting supplier, items, GST details…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Done ──
  if (state === 'done') {
    return (
      <div className="border-2 border-emerald-200 bg-emerald-50 rounded-2xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={22} className="text-emerald-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-emerald-700">Bill scanned successfully!</p>
            <p className="text-sm text-emerald-600 mt-0.5">All fields have been filled. Review and save.</p>
            {preview && (
              <img
                src={preview}
                alt="Uploaded bill"
                className="mt-3 max-h-32 rounded-xl border border-emerald-200 object-contain"
              />
            )}
            {!preview && (
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600">
                <FileImage size={14} /> {fileName}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={reset}
            className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-500 transition-colors shrink-0"
            title="Upload a different bill"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ── Error ──
  return (
    <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <AlertCircle size={22} className="text-red-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-red-700">Could not read bill</p>
          <p className="text-sm text-red-600 mt-0.5">{errMsg}</p>
          <p className="text-xs text-gray-500 mt-2">Please fill the form manually or try a clearer image.</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors shrink-0"
          title="Try again"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function CreatePurchasePage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<FormData>({
      resolver: zodResolver(purchaseSchema) as any,
      defaultValues: {
        purchase_date: new Date().toISOString().split('T')[0],
        gst_type:  'NONE',
        cgst_rate: 9,
        sgst_rate: 9,
        igst_rate: 18,
        items: [{ item_name: '', hsn_code: '', quantity: 1, rate: 0 }],
      },
    });

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' });

  const watchedItems   = watch('items');
  const watchedGstType = watch('gst_type');
  const cgstRate       = watch('cgst_rate');
  const sgstRate       = watch('sgst_rate');
  const igstRate       = watch('igst_rate');

  const subtotal   = watchedItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
  const cgstAmt    = watchedGstType === 'CGST_SGST' ? (subtotal * (cgstRate || 0)) / 100 : 0;
  const sgstAmt    = watchedGstType === 'CGST_SGST' ? (subtotal * (sgstRate || 0)) / 100 : 0;
  const igstAmt    = watchedGstType === 'IGST'      ? (subtotal * (igstRate || 0)) / 100 : 0;
  const totalGst   = cgstAmt + sgstAmt + igstAmt;
  const grandTotal = subtotal + totalGst;

  // Called when AI extraction returns data — fills all form fields
  const handleExtracted = useCallback((data: any) => {
    setValue('bill_no',             data.bill_no             || '');
    setValue('purchase_date',       data.purchase_date       || new Date().toISOString().split('T')[0]);
    setValue('supplier_name',       data.supplier_name       || '');
    setValue('supplier_address',    data.supplier_address    || '');
    setValue('supplier_gst',        data.supplier_gst        || '');
    setValue('supplier_state',      data.supplier_state      || '');
    setValue('supplier_state_code', data.supplier_state_code || '');
    setValue('gst_type',            data.gst_type            || 'NONE');
    setValue('cgst_rate',           data.cgst_rate           ?? 9);
    setValue('sgst_rate',           data.sgst_rate           ?? 9);
    setValue('igst_rate',           data.igst_rate           ?? 18);
    setValue('notes',               data.notes               || '');

    if (Array.isArray(data.items) && data.items.length > 0) {
      replace(data.items.map((item: any) => ({
        item_name: item.item_name || '',
        hsn_code:  item.hsn_code  || '',
        quantity:  Number(item.quantity) || 1,
        rate:      Number(item.rate)     || 0,
      })));
    }
  }, [setValue, replace]);

  const createMutation = useMutation({
    mutationFn: (data: any) => purchasesApi.create(data),
    onSuccess: (res) => {
      toast.success(`Purchase "${res.data.bill_no}" saved!`);
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      navigate('/purchases');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save purchase'),
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate({ ...data, supplier_gst: data.supplier_gst?.toUpperCase() || '' });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl mx-auto space-y-5 fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 font-['Outfit']">New Purchase Entry</h1>
          <p className="text-gray-500 text-sm mt-0.5">Record a supplier purchase bill</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/purchases')} className="btn-outline flex items-center gap-2">
            <ArrowLeft size={15} /> Cancel
          </button>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? 'Saving…' : 'Save Purchase'}
          </button>
        </div>
      </div>

      {/* ── AI Upload Zone ── */}
      <UploadZone onExtracted={handleExtracted} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Bill Info */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Bill Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Bill Number *</label>
                <input className="input-field" placeholder="e.g. INV-2024-001" {...register('bill_no')} />
                {errors.bill_no && <p className="text-red-500 text-xs mt-1">{errors.bill_no.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Purchase Date *</label>
                <input type="date" className="input-field" {...register('purchase_date')} />
                {errors.purchase_date && <p className="text-red-500 text-xs mt-1">{errors.purchase_date.message}</p>}
              </div>
            </div>
          </div>

          {/* Supplier Details */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Supplier Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Supplier / Vendor Name *</label>
                <input className="input-field" placeholder="Enter supplier name…" {...register('supplier_name')} />
                {errors.supplier_name && <p className="text-red-500 text-xs mt-1">{errors.supplier_name.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Address</label>
                <textarea className="input-field" rows={2} placeholder="Supplier address…" {...register('supplier_address')} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">GST Number</label>
                  <input
                    className="input-field font-mono uppercase tracking-wider"
                    placeholder="27AAAAA0000A1Z5"
                    maxLength={15}
                    {...register('supplier_gst')}
                    onChange={e => setValue('supplier_gst', e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">State</label>
                  <select
                    className="input-field"
                    {...register('supplier_state')}
                    onChange={e => {
                      register('supplier_state').onChange(e);
                      const found = INDIAN_STATES.find(s => s.name === e.target.value);
                      if (found) setValue('supplier_state_code', found.code);
                    }}
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">State Code</label>
                  <input className="input-field" placeholder="e.g. 27" {...register('supplier_state_code')} />
                </div>
              </div>
            </div>
          </div>

          {/* GST Type */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-3">GST Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { v: 'NONE',      l: 'No GST',              emoji: '🚫' },
                { v: 'CGST_SGST', l: 'CGST + SGST',         emoji: '📍' },
                { v: 'IGST',      l: 'IGST (Inter-State)',   emoji: '🔁' },
              ].map(({ v, l, emoji }) => (
                <label
                  key={v}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    watchedGstType === v
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
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
              <button
                type="button"
                onClick={() => append({ item_name: '', hsn_code: '', quantity: 1, rate: 0 })}
                className="btn-primary text-xs py-1.5 px-3"
              >
                <Plus size={13} /> Add Item
              </button>
            </div>

            {/* ── MOBILE: card-per-item (hidden on sm+) ── */}
            <div className="space-y-3 sm:hidden">
              {fields.map((field, idx) => {
                const qty  = Number(watchedItems[idx]?.quantity) || 0;
                const rate = Number(watchedItems[idx]?.rate)     || 0;
                return (
                  <div key={field.id} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50/50">
                    {/* Row: # + remove */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 bg-white border border-gray-200 rounded-lg w-7 h-7 flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Description — full width */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block font-medium">Item Description *</label>
                      <textarea
                        className="input-field text-sm w-full"
                        rows={3}
                        style={{ resize: 'vertical' }}
                        placeholder="Enter item name / description…"
                        {...register(`items.${idx}.item_name`)}
                      />
                      {errors.items?.[idx]?.item_name && (
                        <p className="text-red-500 text-xs mt-1">{errors.items[idx]?.item_name?.message}</p>
                      )}
                    </div>

                    {/* HSN + Qty + Rate in a row */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">HSN</label>
                        <input
                          className="input-field text-xs"
                          placeholder="8423"
                          {...register(`items.${idx}.hsn_code`)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Qty</label>
                        <input
                          type="number"
                          className="input-field text-xs text-right"
                          min="0" step="0.01"
                          {...register(`items.${idx}.quantity`)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Rate ₹</label>
                        <input
                          type="number"
                          className="input-field text-xs text-right"
                          min="0" step="0.01"
                          {...register(`items.${idx}.rate`)}
                        />
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                      <span className="text-xs text-gray-500">Amount</span>
                      <span className="font-bold text-gray-800 text-sm">{formatCurrency(qty * rate)}</span>
                    </div>
                  </div>
                );
              })}
              {errors.items && !Array.isArray(errors.items) && (
                <p className="text-red-500 text-xs">{(errors.items as any).message}</p>
              )}
            </div>

            {/* ── DESKTOP: compact table (hidden on mobile) ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2 text-xs text-gray-500 font-semibold w-8">#</th>
                    <th className="text-left p-2 text-xs text-gray-500 font-semibold">Item Description *</th>
                    <th className="text-left p-2 text-xs text-gray-500 font-semibold w-24">HSN</th>
                    <th className="text-right p-2 text-xs text-gray-500 font-semibold w-20">Qty</th>
                    <th className="text-right p-2 text-xs text-gray-500 font-semibold w-28">Rate</th>
                    <th className="text-right p-2 text-xs text-gray-500 font-semibold w-28">Amount</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => {
                    const qty  = Number(watchedItems[idx]?.quantity) || 0;
                    const rate = Number(watchedItems[idx]?.rate)     || 0;
                    return (
                      <tr key={field.id} className="border-t border-gray-100">
                        <td className="p-2 text-gray-400 align-top pt-3">{idx + 1}</td>
                        <td className="p-1">
                          <textarea
                            className="input-field text-sm w-full"
                            rows={3}
                            style={{ minHeight: '72px', resize: 'vertical' }}
                            placeholder="Item name / description…"
                            {...register(`items.${idx}.item_name`)}
                          />
                          {errors.items?.[idx]?.item_name && (
                            <p className="text-red-500 text-xs">{errors.items[idx]?.item_name?.message}</p>
                          )}
                        </td>
                        <td className="p-1 align-top pt-2">
                          <input className="input-field text-xs" placeholder="8423" {...register(`items.${idx}.hsn_code`)} />
                        </td>
                        <td className="p-1 align-top pt-2">
                          <input type="number" className="input-field text-xs text-right" min="0" step="0.01"
                            {...register(`items.${idx}.quantity`)} />
                        </td>
                        <td className="p-1 align-top pt-2">
                          <input type="number" className="input-field text-xs text-right" min="0" step="0.01"
                            {...register(`items.${idx}.rate`)} />
                        </td>
                        <td className="p-2 text-right font-semibold text-gray-700 align-top pt-3">
                          {formatCurrency(qty * rate)}
                        </td>
                        <td className="p-1 align-top pt-2">
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


          {/* Notes */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Notes</h3>
            <textarea className="input-field" rows={2} placeholder="Optional notes…" {...register('notes')} />
          </div>
        </div>

        {/* ── Right column: Rates + Summary ── */}
        <div className="space-y-5">

          {/* GST Rates — only when GST is selected */}
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

          {/* Summary */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Purchase Summary</h3>
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
                  <span>Input GST Credit</span>
                  <span>{formatCurrency(totalGst)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-800 text-base">
                <span>Grand Total</span>
                <span className="text-blue-700">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {totalGst > 0 && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-xs text-emerald-700 font-semibold">🔖 Input GST Credit</p>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">{formatCurrency(totalGst)}</p>
                <p className="text-xs text-emerald-600 mt-0.5">Claimable as input tax credit</p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary w-full justify-center py-3 text-base"
          >
            {createMutation.isPending ? 'Saving…' : '💾 Save Purchase'}
          </button>
        </div>
      </div>
    </form>
  );
}
