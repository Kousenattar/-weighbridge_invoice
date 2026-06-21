import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoicesApi } from '../api';
import { formatCurrency } from '../utils';
import { BarChart3, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ReportsPage() {
  const { isGSTPanel } = useAuth();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // type filter is always scoped by the backend to the user's panel
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', fromDate, toDate],
    queryFn: () => invoicesApi.getReportsSummary({ from_date: fromDate, to_date: toDate }),
  });

  const summary = data?.data || [];
  // Backend already filters, so we just take whatever comes back
  const panelRow = summary[0] || {};
  const totals = {
    count:    panelRow.count    || 0,
    subtotal: panelRow.subtotal || 0,
    cgst:     panelRow.cgst    || 0,
    sgst:     panelRow.sgst    || 0,
    igst:     panelRow.igst    || 0,
    total:    panelRow.total   || 0,
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-['Outfit']">Reports</h1>
          <p className="text-gray-500 text-sm">
            {isGSTPanel ? 'GST sales reports' : 'Non-GST sales reports'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Filter Reports</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">From Date</label>
            <input type="date" className="input-field" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">To Date</label>
            <input type="date" className="input-field" value={toDate} onChange={e => setToDate(e.target.value)} />
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
              { label: 'Total Invoices',  value: totals.count,                                            color: '#2563eb' },
              { label: 'Taxable Amount',  value: formatCurrency(totals.subtotal),                         color: '#10b981' },
              { label: 'Total Tax',       value: formatCurrency(totals.cgst + totals.sgst + totals.igst), color: '#f59e0b' },
              { label: 'Grand Total',     value: formatCurrency(totals.total),                            color: '#8b5cf6' },
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
              <h2 className="font-bold text-gray-800 font-['Outfit']">
                {isGSTPanel ? 'GST Summary' : 'Sales Summary'}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table" style={{ minWidth: '700px' }}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Invoices</th>
                    <th>Taxable Amount</th>
                    {isGSTPanel && <><th>CGST</th><th>SGST</th><th>IGST</th><th>Total Tax</th></>}
                    <th>Grand Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span className={`badge ${isGSTPanel ? 'badge-gst' : 'badge-non-gst'}`}>
                        {isGSTPanel ? 'GST Invoices' : 'Non-GST Invoices'}
                      </span>
                    </td>
                    <td>{totals.count}</td>
                    <td>{formatCurrency(totals.subtotal)}</td>
                    {isGSTPanel && (
                      <>
                        <td>{formatCurrency(totals.cgst)}</td>
                        <td>{formatCurrency(totals.sgst)}</td>
                        <td>{formatCurrency(totals.igst)}</td>
                        <td>{formatCurrency(totals.cgst + totals.sgst + totals.igst)}</td>
                      </>
                    )}
                    <td><span className="font-bold">{formatCurrency(totals.total)}</span></td>
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
