import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoicesApi } from '../api';
import { formatCurrency } from '../utils';
import { BarChart3, TrendingUp, Download } from 'lucide-react';

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [type, setType] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', fromDate, toDate, type],
    queryFn: () => invoicesApi.getReportsSummary({ from_date: fromDate, to_date: toDate, type }),
  });

  const summary = data?.data || [];
  const gst = summary.find((s: any) => s._id === 'GST') || {};
  const nonGst = summary.find((s: any) => s._id === 'NON_GST') || {};
  const totals = {
    count: (gst.count || 0) + (nonGst.count || 0),
    subtotal: (gst.subtotal || 0) + (nonGst.subtotal || 0),
    cgst: gst.cgst || 0,
    sgst: gst.sgst || 0,
    igst: gst.igst || 0,
    total: (gst.total || 0) + (nonGst.total || 0),
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-['Outfit']">Reports</h1>
          <p className="text-gray-500 text-sm">GST and sales reports</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Filter Reports</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">From Date</label>
            <input type="date" className="input-field" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">To Date</label>
            <input type="date" className="input-field" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Invoice Type</label>
            <select className="input-field" value={type} onChange={e => setType(e.target.value)}>
              <option value="">All</option>
              <option value="GST">GST Only</option>
              <option value="NON_GST">Non-GST Only</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full justify-center" onClick={() => refetch()}>Generate Report</button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="card h-24 skeleton"></div>)}</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Invoices', value: totals.count, color: '#2563eb' },
              { label: 'Total Subtotal', value: formatCurrency(totals.subtotal), color: '#10b981' },
              { label: 'Total GST', value: formatCurrency(totals.cgst + totals.sgst + totals.igst), color: '#f59e0b' },
              { label: 'Grand Total', value: formatCurrency(totals.total), color: '#8b5cf6' },
            ].map((s, i) => (
              <div key={i} className="card p-5">
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* GST Breakdown Table */}
          <div className="card overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-800 font-['Outfit']">GST Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table" style={{ minWidth: '800px' }}>
                <thead>
                <tr>
                  <th>Type</th>
                  <th>Invoices</th>
                  <th>Taxable Amount</th>
                  <th>CGST</th>
                  <th>SGST</th>
                  <th>IGST</th>
                  <th>Total Tax</th>
                  <th>Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'GST Invoices', d: gst },
                  { label: 'Non-GST Invoices', d: nonGst },
                ].map(({ label, d }) => (
                  <tr key={label}>
                    <td><span className="font-medium text-gray-700">{label}</span></td>
                    <td>{d.count || 0}</td>
                    <td>{formatCurrency(d.subtotal || 0)}</td>
                    <td>{formatCurrency(d.cgst || 0)}</td>
                    <td>{formatCurrency(d.sgst || 0)}</td>
                    <td>{formatCurrency(d.igst || 0)}</td>
                    <td>{formatCurrency((d.cgst || 0) + (d.sgst || 0) + (d.igst || 0))}</td>
                    <td><span className="font-bold">{formatCurrency(d.total || 0)}</span></td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-bold">
                  <td>Total</td>
                  <td>{totals.count}</td>
                  <td>{formatCurrency(totals.subtotal)}</td>
                  <td>{formatCurrency(totals.cgst)}</td>
                  <td>{formatCurrency(totals.sgst)}</td>
                  <td>{formatCurrency(totals.igst)}</td>
                  <td>{formatCurrency(totals.cgst + totals.sgst + totals.igst)}</td>
                  <td className="text-blue-700">{formatCurrency(totals.total)}</td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
