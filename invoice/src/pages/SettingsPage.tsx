import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { settingsApi } from '../api';
import { Plus, Trash2, Settings, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CompanySettings } from '../types';

const schema = z.object({
  company_name: z.string().min(1, 'Required'),
  gst_number: z.string().min(1, 'Required'),
  address: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  state: z.string().optional(),
  state_code: z.string().optional(),
  bank_name: z.string().optional(),
  account_holder: z.string().optional(),
  account_number: z.string().optional(),
  ifsc: z.string().optional(),
  signatory_name: z.string().optional(),
  specialist_text: z.string().optional(),
  invoice_prefix: z.string().min(1, 'Required').default('CSR'),
  terms: z.array(z.object({ value: z.string() })).optional(),
});
type FormData = z.infer<typeof schema>;

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });

  const settings: CompanySettings = data?.data;

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: settings ? {
      ...settings,
      terms: (settings.terms || []).map((t: string) => ({ value: t })),
    } : undefined,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'terms' });

  const mutation = useMutation({
    mutationFn: (d: FormData) => settingsApi.update({ ...d, terms: (d.terms || []).map(t => t.value) }),
    onSuccess: () => { toast.success('Settings saved!'); queryClient.invalidateQueries({ queryKey: ['settings'] }); },
    onError: () => toast.error('Failed to save settings'),
  });

  if (isLoading) return <div className="card p-8 skeleton h-96 fade-in"></div>;

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-6 fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-['Outfit']">Settings</h1>
          <p className="text-gray-500 text-sm">Company & invoice configuration</p>
        </div>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          <Save size={15} /> {mutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Company Info */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Settings size={16} /> Company Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Company Name *', key: 'company_name', placeholder: 'CHOUDHARI SCALE REPAIRS' },
            { label: 'GST Number *', key: 'gst_number', placeholder: '27AVYPM7309R1ZB' },
            { label: 'Mobile', key: 'mobile', placeholder: '9890615241' },
            { label: 'Email', key: 'email', placeholder: 'choudhariscales@gmail.com' },
            { label: 'State', key: 'state', placeholder: 'Maharashtra' },
            { label: 'State Code', key: 'state_code', placeholder: '27' },
            { label: 'Invoice Prefix *', key: 'invoice_prefix', placeholder: 'CSR' },
            { label: 'Signatory Name', key: 'signatory_name', placeholder: 'Authorized person name' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 mb-1 block">{label}</label>
              <input className="input-field" placeholder={placeholder} {...register(key as any)} />
              {errors[key as keyof typeof errors] && <p className="text-red-500 text-xs mt-1">{String(errors[key as keyof typeof errors]?.message)}</p>}
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Address</label>
            <textarea className="input-field" rows={2} placeholder="Full company address..." {...register('address')} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Specialist Text (shown on invoice header)</label>
            <input className="input-field" {...register('specialist_text')} />
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-700 mb-4">Bank Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Bank Name', key: 'bank_name', placeholder: 'Saraswat Bank' },
            { label: 'Account Holder', key: 'account_holder', placeholder: 'CHOUDHARI SCALE REPAIRS' },
            { label: 'Account Number', key: 'account_number', placeholder: '61000000015462' },
            { label: 'IFSC Code', key: 'ifsc', placeholder: 'SRCB0000167' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 mb-1 block">{label}</label>
              <input className="input-field" placeholder={placeholder} {...register(key as any)} />
            </div>
          ))}
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-700">Terms & Conditions</h2>
          <button type="button" onClick={() => append({ value: '' })} className="btn-outline text-xs py-1.5 px-3">
            <Plus size={13} /> Add Term
          </button>
        </div>
        <div className="space-y-3">
          {fields.map((f, i) => (
            <div key={f.id} className="flex gap-2">
              <span className="text-xs text-gray-400 mt-2.5 w-5">{i + 1}.</span>
              <input className="input-field flex-1" placeholder="Enter term or condition..." {...register(`terms.${i}.value`)} />
              <button type="button" onClick={() => remove(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" disabled={mutation.isPending} className="btn-primary w-full justify-center py-3">
        <Save size={15} /> {mutation.isPending ? 'Saving Settings...' : 'Save All Settings'}
      </button>
    </form>
  );
}
