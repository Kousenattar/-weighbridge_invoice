import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { invoicesApi } from '../api';
import { formatCurrency, formatDate } from '../utils';
import { 
  FileText, TrendingUp, CheckCircle, XCircle, Plus, 
  ArrowUpRight, Eye, Download, BarChart3, IndianRupee
} from 'lucide-react';
import type { DashboardData, Invoice } from '../types';
import { useAuth } from '../context/AuthContext';

function StatCard({ title, value, sub, icon: Icon, gradient, trend }: any) {
  return (
    <div className="stat-card" style={{ background: `linear-gradient(135deg, white, ${gradient}20)` }}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ background: gradient + '20' }}>
          <Icon size={22} style={{ color: gradient }} />
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
            <ArrowUpRight size={12} />
            <span>{trend}%</span>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-800 mb-1">{value}</div>
      <div className="text-sm text-gray-500">{title}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'badge-draft', sent: 'badge-sent', paid: 'badge-paid', cancelled: 'badge-cancelled'
  };
  return <span className={`badge ${map[status] || 'badge-draft'}`}>{status}</span>;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isGSTPanel } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => invoicesApi.getDashboard(),
    refetchInterval: 30000,
  });

  const d: DashboardData = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="card p-6 h-32 skeleton"></div>
          ))}
        </div>
        <div className="card p-6 h-64 skeleton"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-['Outfit']">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isGSTPanel ? 'GST Billing Management' : 'Non-GST Invoice Management'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/invoices/new')}>
          <Plus size={16} />
          Create Invoice
        </button>
      </div>

      {/* Stats Grid */}
      <div className={`grid grid-cols-2 ${isGSTPanel ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        <StatCard
          title="Total Invoices"
          value={d?.totalInvoices || 0}
          icon={FileText}
          gradient="#2563eb"
          trend={12}
        />
        {isGSTPanel ? (
          <StatCard
            title="GST Invoices"
            value={d?.gstInvoices || 0}
            sub="Tax invoices generated"
            icon={CheckCircle}
            gradient="#10b981"
          />
        ) : (
          <StatCard
            title="Non-GST Invoices"
            value={d?.nonGstInvoices || 0}
            sub="Simple bills"
            icon={XCircle}
            gradient="#f59e0b"
          />
        )}
        {isGSTPanel && (
          <StatCard
            title="Non-GST Invoices"
            value={d?.nonGstInvoices || 0}
            sub="Simple bills"
            icon={XCircle}
            gradient="#f59e0b"
          />
        )}
        <StatCard
          title="Monthly Sales"
          value={formatCurrency(d?.monthlySales || 0)}
          sub="This month's revenue"
          icon={IndianRupee}
          gradient="#8b5cf6"
          trend={8}
        />
      </div>

      {/* Monthly Chart + Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simple Bar Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-800 font-['Outfit']">Monthly Sales</h2>
            <button onClick={() => navigate('/reports')} className="text-blue-600 text-sm flex items-center gap-1 hover:underline">
              View Reports <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="flex items-end gap-3 h-40">
            {(d?.monthlyData || []).map((m, i) => {
              const max = Math.max(...(d?.monthlyData || []).map(x => x.total), 1);
              const h = (m.total / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-xs text-gray-500">{formatCurrency(m.total).replace('₹','₹')}</div>
                  <div
                    className="w-full rounded-t-lg transition-all hover:opacity-80"
                    style={{
                      height: `${Math.max(h, 4)}%`,
                      background: i === (d?.monthlyData?.length || 1) - 1
                        ? 'linear-gradient(180deg, #2563eb, #1d4ed8)'
                        : 'linear-gradient(180deg, #93c5fd, #bfdbfe)',
                      minHeight: '8px',
                    }}
                    title={`${m.month}: ${formatCurrency(m.total)}`}
                  ></div>
                  <div className="text-xs text-gray-400 text-center">{m.month.split(' ')[0]}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-800 font-['Outfit'] mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {(isGSTPanel ? [
              { label: 'New GST Invoice', desc: 'CGST + SGST or IGST', icon: FileText, color: '#2563eb', action: () => navigate('/invoices/new?type=GST') },
              { label: 'View All Invoices', desc: 'Manage invoices', icon: BarChart3, color: '#8b5cf6', action: () => navigate('/invoices') },
              { label: 'GST Analysis', desc: 'Output vs input tax', icon: TrendingUp, color: '#10b981', action: () => navigate('/gst-analysis') },
              { label: 'Reports', desc: 'GST & Sales reports', icon: TrendingUp, color: '#f59e0b', action: () => navigate('/reports') },
            ] : [
              { label: 'New Invoice', desc: 'Simple billing', icon: FileText, color: '#10b981', action: () => navigate('/invoices/new') },
              { label: 'View All Invoices', desc: 'Manage invoices', icon: BarChart3, color: '#8b5cf6', action: () => navigate('/invoices') },
              { label: 'Combined Analysis', desc: 'GST & Non-GST report', icon: TrendingUp, color: '#0d9488', action: () => navigate('/combined-analysis') },
              { label: 'Reports', desc: 'Sales reports', icon: TrendingUp, color: '#f59e0b', action: () => navigate('/reports') },
            ]).map((a, i) => (
              <button
                key={i}
                onClick={a.action}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: a.color + '15' }}>
                  <a.icon size={16} style={{ color: a.color }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-700">{a.label}</div>
                  <div className="text-xs text-gray-400">{a.desc}</div>
                </div>
                <ArrowUpRight size={14} className="ml-auto text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-800 font-['Outfit']">Recent Invoices</h2>
          <button onClick={() => navigate('/invoices')} className="text-blue-600 text-sm hover:underline flex items-center gap-1">
            View All <ArrowUpRight size={14} />
          </button>
        </div>
        {!d?.recentInvoices?.length ? (
          <div className="text-center py-12 text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-50" />
            <p>No invoices yet. Create your first invoice!</p>
            <button className="btn-primary mt-4" onClick={() => navigate('/invoices/new')}>
              <Plus size={14} /> Create Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {d.recentInvoices.map((inv: Invoice) => (
                  <tr key={inv._id}>
                    <td>
                      <span className="font-semibold text-blue-700">{inv.invoice_number}</span>
                    </td>
                    <td>
                      <div className="font-medium text-gray-700">{inv.client?.client_name}</div>
                      <div className="text-xs text-gray-400">{inv.client?.gst_number}</div>
                    </td>
                    <td>
                      <span className={`badge ${inv.invoice_type === 'GST' ? 'badge-gst' : 'badge-non-gst'}`}>
                        {inv.invoice_type === 'GST' ? `GST (${inv.gst_type === 'CGST_SGST' ? 'CGST+SGST' : 'IGST'})` : 'Non-GST'}
                      </span>
                    </td>
                    <td className="text-gray-500">{formatDate(inv.invoice_date)}</td>
                    <td>
                      <span className="font-semibold text-gray-800">{formatCurrency(inv.grand_total)}</span>
                    </td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/invoices/${inv._id}`)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => invoicesApi.downloadPDF(inv._id, inv.invoice_number)}
                          className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
