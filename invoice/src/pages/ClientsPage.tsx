import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../api';
import { formatDate } from '../utils';
import { Plus, Search, Edit2, Trash2, Users, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { INDIAN_STATES } from '../utils';
import type { Client } from '../types';

const clientSchema = z.object({
  client_name: z.string().min(1, 'Required'),
  gst_number: z.string().optional(),
  address: z.string().optional(),
  state: z.string().optional(),
  state_code: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email('Invalid').optional().or(z.literal('')),
  is_gst_registered: z.boolean().default(true),
});
type ClientForm = z.infer<typeof clientSchema>;

function ClientModal({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema) as any,
    defaultValues: client ? {
      client_name: client.client_name, gst_number: client.gst_number,
      address: client.address, state: client.state, state_code: client.state_code,
      mobile: client.mobile, email: client.email, is_gst_registered: client.is_gst_registered,
    } : { is_gst_registered: true },
  });

  const mutation = useMutation({
    mutationFn: (data: ClientForm) => client ? clientsApi.update(client._id, data) : clientsApi.create(data),
    onSuccess: () => {
      toast.success(client ? 'Client updated' : 'Client added');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">{client ? 'Edit Client' : 'Add Client'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Client Name *</label>
              <input className="input-field" {...register('client_name')} />
              {errors.client_name && <p className="text-red-500 text-xs">{errors.client_name.message}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">GST Number</label>
              <input className="input-field uppercase" placeholder="27XXXXX..." {...register('gst_number')} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Mobile</label>
              <input className="input-field" {...register('mobile')} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Address</label>
              <textarea className="input-field" rows={2} {...register('address')} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">State</label>
              <select className="input-field" {...register('state')}
                onChange={e => { register('state').onChange(e); const s = INDIAN_STATES.find(x => x.name === e.target.value); if (s) setValue('state_code', s.code); }}>
                <option value="">Select State</option>
                {INDIAN_STATES.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">State Code</label>
              <input className="input-field" {...register('state_code')} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <input type="email" className="input-field" {...register('email')} />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input type="checkbox" id="gst_reg" {...register('is_gst_registered')} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="gst_reg" className="text-sm text-gray-600">GST Registered</label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-outline">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 btn-primary justify-center">
              {mutation.isPending ? 'Saving...' : (client ? 'Update' : 'Add Client')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ open: boolean; client: Client | null }>({ open: false, client: null });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['clients', page, search],
    queryFn: () => clientsApi.getAll({ page, limit: 15, search }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => { toast.success('Client deleted'); queryClient.invalidateQueries({ queryKey: ['clients'] }); setDeleteId(null); },
  });

  const clients: Client[] = data?.data || [];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-['Outfit']">Clients</h1>
          <p className="text-gray-500 text-sm">{data?.total || 0} clients registered</p>
        </div>
        
        <button className="btn-primary" onClick={() => setModal({ open: true, client: null })}>
          <Plus size={16} /> Add Client
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-9" placeholder="Search by name, GST number..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded"></div>)}</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-40" />
            <p>No clients found</p>
            <button className="btn-primary mt-4" onClick={() => setModal({ open: true, client: null })}>
              <Plus size={14} /> Add Client
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-full">
              <thead>
                <tr>
                  <th className="whitespace-nowrap">Client Name</th>
                  <th className="whitespace-nowrap">GST Number</th>
                  <th className="whitespace-nowrap">State</th>
                  <th className="whitespace-nowrap">Mobile</th>
                  <th className="whitespace-nowrap">GST Status</th>
                  <th className="whitespace-nowrap">Added</th>
                  <th className="whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c._id}>
                    <td className="whitespace-nowrap"><div className="font-semibold text-gray-800">{c.client_name}</div>{c.trade_name && <div className="text-xs text-gray-400">{c.trade_name}</div>}</td>
                    <td className="whitespace-nowrap"><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{c.gst_number || '—'}</span></td>
                    <td className="whitespace-nowrap">{c.state || '—'} {c.state_code && <span className="text-xs text-gray-400">({c.state_code})</span>}</td>
                    <td className="text-gray-600 whitespace-nowrap">{c.mobile || '—'}</td>
                    <td className="whitespace-nowrap">
                      <span className={`badge ${c.is_gst_registered ? 'badge-gst' : 'badge-non-gst'}`}>
                        {c.is_gst_registered ? 'GST Reg.' : 'Non-GST'}
                      </span>
                    </td>
                    <td className="text-gray-400 text-xs whitespace-nowrap">{c.createdAt ? formatDate(c.createdAt) : '—'}</td>
                    <td className="whitespace-nowrap">
                      <div className="flex gap-1">
                        <button onClick={() => setModal({ open: true, client: c })} className="p-1.5 rounded text-blue-600 hover:bg-blue-50"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteId(c._id)} className="p-1.5 rounded text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open && <ClientModal client={modal.client} onClose={() => setModal({ open: false, client: null })} />}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-red-600" /></div>
              <h3 className="text-lg font-bold mb-2">Delete Client?</h3>
              <p className="text-gray-500 text-sm mb-6">This will permanently remove this client.</p>
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
