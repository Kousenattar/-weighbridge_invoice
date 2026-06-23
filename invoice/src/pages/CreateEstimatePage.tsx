import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { estimatesApi } from '../api';
import { formatCurrency, INDIAN_STATES } from '../utils';
import { Plus, Trash2, ArrowLeft, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';



// ─── Schema ──────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  item_name: z.string().min(1, 'Required'),
  hsn_code:  z.string().optional(),
  quantity:  z.coerce.number().min(0.01, 'Must be > 0'),
  rate:      z.coerce.number().min(0, 'Must be >= 0'),
});

const estimateSchema = z.object({
  estimate_date: z.string().min(1, 'Date required'),
  valid_until:   z.string().optional(),
  client_name:   z.string().min(1, 'Client name required'),
  client_address: z.string().optional(),
  client_phone:  z.string().optional(),
  client_gst:    z.string().optional(),
  place_of_supply: z.string().optional(),
  gst_type:      z.enum(['CGST_SGST', 'IGST', 'NONE']),
  cgst_rate:     z.coerce.number().default(9),
  sgst_rate:     z.coerce.number().default(9),
  igst_rate:     z.coerce.number().default(18),
  notes:         z.string().optional(),
  items:         z.array(itemSchema).min(1, 'At least one item required'),
});

type FormData = z.infer<typeof estimateSchema>;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreateEstimatePage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormData>({
      resolver: zodResolver(estimateSchema) as any,
      defaultValues: {
        estimate_date: new Date().toISOString().split('T')[0],
        gst_type:  'CGST_SGST',
        cgst_rate: 9,
        sgst_rate: 9,
        igst_rate: 18,
        items: [{
          item_name: `Electronics weighbridge
Brand :-Equal
Capacity :- 60000 kg
Accuracy :- 10kg
Platform Size :- 9 Mtr *3Mtr
Intelligient Terminal No of : 1
No of Loadcell :6
Type of loadcell :- Cup Ball
Capacity of each Loadcell 30 Ton.
Make of Loadcell :- C.S.R Inc India
Epson LQ310 ,Printer No of: 1
External Jumbo Display No of : 1
Junction Box No of : 1
Platform :- 10mm top plate with welded 20x5 mm antiskid bar on top fully welded structure of platform
weight @ 5000kg
400 I beam . 250 I beam 200 I beam
With Loadcell Assembly, Installation ,Commissioning , Testing , and Govt Stamping ,
Transportation Including .`,
          hsn_code: '8423',
          quantity: 1,
          rate: 550000,
        }],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedItems   = watch('items');
  const watchedGstType = watch('gst_type');
  const cgstRate       = watch('cgst_rate');
  const sgstRate       = watch('sgst_rate');
  const igstRate       = watch('igst_rate');

  // Live calculation
  const isCGST = watchedGstType === 'CGST_SGST';
  const isIGST = watchedGstType === 'IGST';

  const subtotal = watchedItems.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0
  );
  const cgstAmt    = isCGST ? (subtotal * (cgstRate || 0)) / 100 : 0;
  const sgstAmt    = isCGST ? (subtotal * (sgstRate || 0)) / 100 : 0;
  const igstAmt    = isIGST ? (subtotal * (igstRate || 0)) / 100 : 0;
  const totalTax   = cgstAmt + sgstAmt + igstAmt;
  const grandTotal = Math.round(subtotal + totalTax);

  const createMutation = useMutation({
    mutationFn: (data: any) => estimatesApi.create(data),
    onSuccess: (res) => {
      toast.success(`Estimate ${res.data.estimate_number} created!`);
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      navigate(`/estimates/${res.data._id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create estimate'),
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate({
      ...data,
      client_gst: data.client_gst?.toUpperCase() || '',
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className=" mx-auto space-y-5 fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 font-['Outfit']">
            New Estimate / Quotation
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Fill the form and generate a PDF quotation for your client</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/estimates')} className="btn-outline flex items-center gap-2">
            <ArrowLeft size={15} /> Cancel
          </button>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary flex items-center gap-2">
            <FileText size={15} />
            {createMutation.isPending ? 'Saving…' : 'Save & View'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Estimate Info */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">1</span>
              Quotation Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Quotation Date *</label>
                <input type="date" className="input-field" {...register('estimate_date')} />
                {errors.estimate_date && <p className="text-red-500 text-xs mt-1">{errors.estimate_date.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Valid Until (optional)</label>
                <input type="date" className="input-field" {...register('valid_until')} />
              </div>
            </div>
          </div>

          {/* Client Details */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-xs font-bold">2</span>
              Client Details
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Client / Party Name (M/S) *</label>
                <input
                  className="input-field"
                  placeholder="e.g. M/S Imran Mujawar"
                  {...register('client_name')}
                />
                {errors.client_name && <p className="text-red-500 text-xs mt-1">{errors.client_name.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Address</label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Client full address…"
                  {...register('client_address')}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                  <input
                    className="input-field"
                    placeholder="9175801555"
                    {...register('client_phone')}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">GSTIN</label>
                  <input
                    className="input-field font-mono uppercase tracking-wider"
                    placeholder="27AAAAA0000A1Z5"
                    maxLength={15}
                    {...register('client_gst')}
                    onChange={e => setValue('client_gst', e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Place of Supply</label>
                  <select
                    className="input-field"
                    {...register('place_of_supply')}
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => (
                      <option key={s.code} value={`${s.name} (${s.code})`}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* GST Type */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xs font-bold">3</span>
              GST Type
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { v: 'NONE',      l: 'No GST',            emoji: '🚫' },
                { v: 'CGST_SGST', l: 'CGST + SGST',       emoji: '📍' },
                { v: 'IGST',      l: 'IGST (Inter-State)', emoji: '🔁' },
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

          {/* Items Table */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-xs font-bold">4</span>
                Items / Products / Services
              </h3>
              <button
                type="button"
                onClick={() => append({ item_name: '', hsn_code: '', quantity: 1, rate: 0 })}
                className="btn-primary text-xs py-1.5 px-3"
              >
                <Plus size={13} /> Add Item
              </button>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 sm:hidden">
              {fields.map((field, idx) => {
                const qty  = Number(watchedItems[idx]?.quantity) || 0;
                const rate = Number(watchedItems[idx]?.rate)     || 0;
                const taxVal = qty * rate;
                const cg = isCGST ? (taxVal * (cgstRate || 0)) / 100 : 0;
                const sg = isCGST ? (taxVal * (sgstRate || 0)) / 100 : 0;
                const ig = isIGST ? (taxVal * (igstRate || 0)) / 100 : 0;
                return (
                  <div key={field.id} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 bg-white border border-gray-200 rounded-lg w-7 h-7 flex items-center justify-center">{idx + 1}</span>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block font-medium">Product / Service *</label>
                      <textarea className="input-field text-sm w-full" rows={4} style={{ resize: 'vertical', minHeight: '100px' }}
                        placeholder="Enter item description…" {...register(`items.${idx}.item_name`)} />
                      {errors.items?.[idx]?.item_name && <p className="text-red-500 text-xs mt-1">{errors.items[idx]?.item_name?.message}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">HSN/SAC</label>
                        <input className="input-field text-xs" placeholder="8423" {...register(`items.${idx}.hsn_code`)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Qty</label>
                        <input type="number" className="input-field text-xs text-right" min="0" step="0.01" {...register(`items.${idx}.quantity`)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Rate ₹</label>
                        <input type="number" className="input-field text-xs text-right" min="0" step="0.01" {...register(`items.${idx}.rate`)} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                      <span className="text-xs text-gray-500">Taxable</span>
                      <span className="font-semibold text-gray-800 text-sm">{formatCurrency(taxVal)}</span>
                    </div>
                    {watchedGstType !== 'NONE' && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Total (with GST)</span>
                        <span className="font-bold text-blue-700 text-sm">{formatCurrency(taxVal + cg + sg + ig)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2 text-xs text-gray-500 font-semibold w-8">#</th>
                    <th className="text-left p-2 text-xs text-gray-500 font-semibold" style={{ minWidth: '200px' }}>Name of Product / Service *</th>
                    <th className="text-left p-2 text-xs text-gray-500 font-semibold w-20">HSN/SAC</th>
                    <th className="text-right p-2 text-xs text-gray-500 font-semibold w-16">Qty</th>
                    <th className="text-right p-2 text-xs text-gray-500 font-semibold w-24">Rate</th>
                    <th className="text-right p-2 text-xs text-gray-500 font-semibold w-24">Taxable</th>
                    {watchedGstType !== 'NONE' && (
                      isCGST
                        ? <>
                            <th className="text-center p-2 text-xs text-gray-500 font-semibold w-20">CGST</th>
                            <th className="text-center p-2 text-xs text-gray-500 font-semibold w-20">SGST</th>
                          </>
                        : <th className="text-center p-2 text-xs text-gray-500 font-semibold w-20">IGST</th>
                    )}
                    <th className="text-right p-2 text-xs text-gray-500 font-semibold w-24">Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => {
                    const qty  = Number(watchedItems[idx]?.quantity) || 0;
                    const rate = Number(watchedItems[idx]?.rate)     || 0;
                    const taxVal = qty * rate;
                    const cg = isCGST ? (taxVal * (cgstRate || 0)) / 100 : 0;
                    const sg = isCGST ? (taxVal * (sgstRate || 0)) / 100 : 0;
                    const ig = isIGST ? (taxVal * (igstRate || 0)) / 100 : 0;
                    const rowTotal = taxVal + cg + sg + ig;
                    return (
                      <tr key={field.id} className="border-t border-gray-100">
                        <td className="p-2 text-gray-400 align-top pt-3">{idx + 1}</td>
                        <td className="p-1">
                          <textarea
                            className="input-field w-full"
                            rows={4}
                            style={{ minHeight: '96px', resize: 'vertical', fontSize: '0.95rem' }}
                            placeholder="Item name / description…"
                            {...register(`items.${idx}.item_name`)}
                          />
                          {errors.items?.[idx]?.item_name && <p className="text-red-500 text-xs">{errors.items[idx]?.item_name?.message}</p>}
                        </td>
                        <td className="p-1 align-top pt-2">
                          <input className="input-field" style={{ fontSize: '0.95rem' }} placeholder="8423" {...register(`items.${idx}.hsn_code`)} />
                        </td>
                        <td className="p-1 align-top pt-2">
                          <input type="number" className="input-field text-right" style={{ fontSize: '0.95rem' }} min="0" step="0.01" {...register(`items.${idx}.quantity`)} />
                        </td>
                        <td className="p-1 align-top pt-2">
                          <input type="number" className="input-field text-right" style={{ fontSize: '0.95rem' }} min="0" step="0.01" {...register(`items.${idx}.rate`)} />
                        </td>
                        <td className="p-2 text-right text-gray-600 align-top pt-3">{formatCurrency(taxVal)}</td>
                        {watchedGstType !== 'NONE' && (
                          isCGST
                            ? <>
                                <td className="p-2 text-center text-xs text-gray-600 align-top pt-3">
                                  <span className="block font-medium">{cgstRate}%</span>
                                  <span className="text-gray-500">{formatCurrency(cg)}</span>
                                </td>
                                <td className="p-2 text-center text-xs text-gray-600 align-top pt-3">
                                  <span className="block font-medium">{sgstRate}%</span>
                                  <span className="text-gray-500">{formatCurrency(sg)}</span>
                                </td>
                              </>
                            : <td className="p-2 text-center text-xs text-gray-600 align-top pt-3">
                                <span className="block font-medium">{igstRate}%</span>
                                <span className="text-gray-500">{formatCurrency(ig)}</span>
                              </td>
                        )}
                        <td className="p-2 text-right font-bold text-gray-800 align-top pt-3">{formatCurrency(rowTotal)}</td>
                        <td className="p-1 align-top pt-2">
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
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
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold">5</span>
              Notes / Terms (optional)
            </h3>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Add any notes, delivery terms, payment terms…"
              {...register('notes')}
            />
          </div>
        </div>

        {/* ── Right column: Rates + Summary ── */}
        <div className="space-y-5">

          {/* GST Rates */}
          {watchedGstType !== 'NONE' && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-700 mb-3">GST Rates</h3>
              {isCGST ? (
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
            <h3 className="font-semibold text-gray-700 mb-4">Quotation Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Taxable Amount</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {isCGST && (
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
              {isIGST && (
                <div className="flex justify-between text-gray-600">
                  <span>IGST ({igstRate}%)</span>
                  <span>{formatCurrency(igstAmt)}</span>
                </div>
              )}
              {totalTax > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Total Tax</span>
                  <span>{formatCurrency(totalTax)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-800 text-base">
                <span>Grand Total</span>
                <span className="text-blue-700">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-600 font-medium">Total Items: {fields.length}</p>
              <p className="text-lg font-bold text-blue-700 mt-0.5">{formatCurrency(grandTotal)}</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary w-full justify-center py-3 text-base flex items-center gap-2"
          >
            <Download size={16} />
            {createMutation.isPending ? 'Creating…' : 'Create & Download PDF'}
          </button>
        </div>
      </div>
    </form>
  );
}
