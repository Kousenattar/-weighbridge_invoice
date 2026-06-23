import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi } from '../api';
import { formatCurrency } from '../utils';
import {
  Plus, Search, Eye, Pencil, Trash2, ShoppingCart,
  ChevronLeft, ChevronRight, FileDown, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import type { Purchase } from '../types';

// ── Excel export helper ────────────────────────────────────────────────────────
function exportToExcel(purchases: Purchase[], filters: Record<string, string>) {
  if (!purchases.length) { toast.error('No records to export'); return; }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const fmtMonth = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Group by month
  const monthMap: Record<string, Purchase[]> = {};
  purchases.forEach(p => {
    const key = fmtMonth(p.purchase_date as unknown as string);
    if (!monthMap[key]) monthMap[key] = [];
    monthMap[key].push(p);
  });

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: All Purchases (flat) ────────────────────────────────────────
  const allRows = purchases.map((p, i) => ({
    'Sr.': i + 1,
    'Bill No.': p.bill_no,
    'Date': fmtDate(p.purchase_date as unknown as string),
    'Month': fmtMonth(p.purchase_date as unknown as string),
    'Supplier Name': p.supplier_name,
    'Supplier Address': p.supplier_address || '',
    'Supplier GSTIN': p.supplier_gst || '',
    'State': p.supplier_state || '',
    'GST Type': p.gst_type === 'CGST_SGST' ? 'CGST+SGST' : p.gst_type === 'IGST' ? 'IGST' : 'No GST',
    'Subtotal (₹)': Number(p.subtotal) || 0,
    'CGST (₹)': Number(p.cgst_amount) || 0,
    'SGST (₹)': Number(p.sgst_amount) || 0,
    'IGST (₹)': Number(p.igst_amount) || 0,
    'Total GST (₹)': Number(p.total_gst) || 0,
    'Grand Total (₹)': Number(p.grand_total) || 0,
    'Notes': p.notes || '',
  }));

  // Add totals row
  const totalsRow: Record<string, any> = {
    'Sr.': '', 'Bill No.': 'TOTAL', 'Date': '', 'Month': '',
    'Supplier Name': `${purchases.length} bills`,
    'Supplier Address': '', 'Supplier GSTIN': '', 'State': '',
    'GST Type': '',
    'Subtotal (₹)':    purchases.reduce((s, p) => s + (Number(p.subtotal)    || 0), 0),
    'CGST (₹)':        purchases.reduce((s, p) => s + (Number(p.cgst_amount) || 0), 0),
    'SGST (₹)':        purchases.reduce((s, p) => s + (Number(p.sgst_amount) || 0), 0),
    'IGST (₹)':        purchases.reduce((s, p) => s + (Number(p.igst_amount) || 0), 0),
    'Total GST (₹)':   purchases.reduce((s, p) => s + (Number(p.total_gst)   || 0), 0),
    'Grand Total (₹)': purchases.reduce((s, p) => s + (Number(p.grand_total) || 0), 0),
    'Notes': '',
  };
  allRows.push(totalsRow as any);

  const ws1 = XLSX.utils.json_to_sheet(allRows);

  // Column widths
  ws1['!cols'] = [
    { wch: 5 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 28 },
    { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 12 },
    { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'All Purchases');

  // ── Sheet 2: Month-wise Summary ──────────────────────────────────────────
  const monthSummaryRows = Object.entries(monthMap).map(([month, bills]) => ({
    'Month': month,
    'No. of Bills': bills.length,
    'Subtotal (₹)':    bills.reduce((s, p) => s + (Number(p.subtotal)    || 0), 0),
    'CGST (₹)':        bills.reduce((s, p) => s + (Number(p.cgst_amount) || 0), 0),
    'SGST (₹)':        bills.reduce((s, p) => s + (Number(p.sgst_amount) || 0), 0),
    'IGST (₹)':        bills.reduce((s, p) => s + (Number(p.igst_amount) || 0), 0),
    'Total GST (₹)':   bills.reduce((s, p) => s + (Number(p.total_gst)   || 0), 0),
    'Grand Total (₹)': bills.reduce((s, p) => s + (Number(p.grand_total) || 0), 0),
  }));

  // Overall total
  monthSummaryRows.push({
    'Month': 'GRAND TOTAL',
    'No. of Bills': purchases.length,
    'Subtotal (₹)':    purchases.reduce((s, p) => s + (Number(p.subtotal)    || 0), 0),
    'CGST (₹)':        purchases.reduce((s, p) => s + (Number(p.cgst_amount) || 0), 0),
    'SGST (₹)':        purchases.reduce((s, p) => s + (Number(p.sgst_amount) || 0), 0),
    'IGST (₹)':        purchases.reduce((s, p) => s + (Number(p.igst_amount) || 0), 0),
    'Total GST (₹)':   purchases.reduce((s, p) => s + (Number(p.total_gst)   || 0), 0),
    'Grand Total (₹)': purchases.reduce((s, p) => s + (Number(p.grand_total) || 0), 0),
  });

  const ws2 = XLSX.utils.json_to_sheet(monthSummaryRows);
  ws2['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 13 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Monthly Summary');

  // ── One sheet per month ───────────────────────────────────────────────────
  Object.entries(monthMap).forEach(([month, bills]) => {
    const rows = bills.map((p, i) => ({
      'Sr.': i + 1,
      'Bill No.': p.bill_no,
      'Date': fmtDate(p.purchase_date as unknown as string),
      'Supplier Name': p.supplier_name,
      'Supplier GSTIN': p.supplier_gst || '',
      'GST Type': p.gst_type === 'CGST_SGST' ? 'CGST+SGST' : p.gst_type === 'IGST' ? 'IGST' : 'No GST',
      'Subtotal (₹)': Number(p.subtotal)    || 0,
      'CGST (₹)':     Number(p.cgst_amount) || 0,
      'SGST (₹)':     Number(p.sgst_amount) || 0,
      'IGST (₹)':     Number(p.igst_amount) || 0,
      'Total GST (₹)': Number(p.total_gst)  || 0,
      'Grand Total (₹)': Number(p.grand_total) || 0,
    }));

    // Totals
    rows.push({
      'Sr.': '' as any, 'Bill No.': 'TOTAL', 'Date': '', 'Supplier Name': `${bills.length} bills`,
      'Supplier GSTIN': '', 'GST Type': '',
      'Subtotal (₹)':    bills.reduce((s, p) => s + (Number(p.subtotal)    || 0), 0),
      'CGST (₹)':        bills.reduce((s, p) => s + (Number(p.cgst_amount) || 0), 0),
      'SGST (₹)':        bills.reduce((s, p) => s + (Number(p.sgst_amount) || 0), 0),
      'IGST (₹)':        bills.reduce((s, p) => s + (Number(p.igst_amount) || 0), 0),
      'Total GST (₹)':   bills.reduce((s, p) => s + (Number(p.total_gst)   || 0), 0),
      'Grand Total (₹)': bills.reduce((s, p) => s + (Number(p.grand_total) || 0), 0),
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 13 }, { wch: 26 }, { wch: 18 }, { wch: 12 }, { wch: 13 }, { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 12 }, { wch: 14 }];
    // Sheet name max 31 chars in Excel
    const sheetName = month.replace(' ', '-').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // Build filename
  const dateStr = new Date().toISOString().slice(0, 10);
  const filterStr = filters.from_date && filters.to_date
    ? `_${filters.from_date}_to_${filters.to_date}`
    : filters.from_date ? `_from_${filters.from_date}`
    : filters.to_date   ? `_to_${filters.to_date}`
    : '';
  const supplierStr = filters.supplier_name ? `_${filters.supplier_name.slice(0, 15)}` : '';
  const filename = `Purchases${supplierStr}${filterStr}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
  toast.success(`Excel downloaded! (${purchases.length} records)`);
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PurchasesPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState({
    supplier_name: '',
    bill_no:       '',
    from_date:     '',
    to_date:       '',
  });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', filters, page],
    queryFn:  () => purchasesApi.getAll({ ...filters, page, limit: 15 }),
  });

  const purchases: Purchase[] = data?.data || [];
  const total    = data?.total || 0;
  const pages    = data?.pages || 1;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => purchasesApi.delete(id),
    onSuccess: () => {
      toast.success('Purchase deleted');
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Delete failed'),
  });

  const handleDelete = (id: string, billNo: string) => {
    if (confirm(`Delete purchase "${billNo}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ supplier_name: '', bill_no: '', from_date: '', to_date: '' });
    setPage(1);
  };

  const hasFilters = Object.values(filters).some(Boolean);

  // Excel download: fetch ALL matching records then export
  const handleExcelDownload = async () => {
    setExporting(true);
    try {
      const res = await purchasesApi.exportAll(
        hasFilters ? filters : undefined
      );
      exportToExcel(res.data || [], filters);
    } catch {
      toast.error('Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5 fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-['Outfit'] flex items-center gap-2">
            <ShoppingCart size={22} className="text-blue-600" /> Purchases
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {total > 0 ? `${total} purchase record${total > 1 ? 's' : ''}` : 'No purchases yet'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="export-excel-btn"
            onClick={handleExcelDownload}
            disabled={exporting}
            className="btn-outline flex items-center gap-2 border-emerald-500 text-emerald-700 hover:bg-emerald-500 hover:text-white"
          >
            {exporting
              ? <Loader2 size={15} className="animate-spin" />
              : <FileDown size={15} />
            }
            {exporting ? 'Exporting…' : 'Download Excel'}
          </button>
          <button onClick={() => navigate('/purchases/new')} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Purchase
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-8"
              placeholder="Supplier name..."
              name="supplier_name"
              value={filters.supplier_name}
              onChange={handleFilter}
            />
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-8"
              placeholder="Bill number..."
              name="bill_no"
              value={filters.bill_no}
              onChange={handleFilter}
            />
          </div>
          <div>
            <input
              type="date"
              className="input-field"
              name="from_date"
              value={filters.from_date}
              onChange={handleFilter}
              placeholder="From date"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              className="input-field flex-1"
              name="to_date"
              value={filters.to_date}
              onChange={handleFilter}
              placeholder="To date"
            />
            {hasFilters && (
              <button onClick={clearFilters} className="btn-outline px-3 text-xs whitespace-nowrap">
                Clear
              </button>
            )}
          </div>
        </div>
        {hasFilters && (
          <p className="text-xs text-blue-600 mt-2 font-medium">
            🔍 Filters active — Excel will download only filtered records
          </p>
        )}
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              {hasFilters ? 'No purchases match your filters' : 'No purchases yet'}
            </p>
            {!hasFilters && (
              <button onClick={() => navigate('/purchases/new')} className="btn-primary mt-4">
                <Plus size={15} /> Add First Purchase
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left p-4 text-xs font-semibold text-gray-500">Bill No.</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500">Date</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500">Supplier</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500">GST No.</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500">GST Type</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500">Subtotal</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500">GST Paid</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-500">Grand Total</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p._id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <span className="font-semibold text-blue-700 font-mono text-xs bg-blue-50 px-2 py-1 rounded-lg">
                        {p.bill_no}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 whitespace-nowrap">
                      {new Date(p.purchase_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-800">{p.supplier_name}</div>
                      {p.supplier_state && <div className="text-xs text-gray-400">{p.supplier_state}</div>}
                    </td>
                    <td className="p-4 text-gray-500 font-mono text-xs">
                      {p.supplier_gst || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="p-4">
                      <span className={`badge text-xs ${
                        p.gst_type === 'CGST_SGST' ? 'badge-gst' :
                        p.gst_type === 'IGST'      ? 'badge-nonGst' :
                        'bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full'
                      }`}>
                        {p.gst_type === 'CGST_SGST' ? 'CGST+SGST' :
                         p.gst_type === 'IGST'       ? 'IGST' : 'No GST'}
                      </span>
                    </td>
                    <td className="p-4 text-right text-gray-700">{formatCurrency(p.subtotal)}</td>
                    <td className="p-4 text-right">
                      {p.total_gst > 0 ? (
                        <span className="text-emerald-600 font-medium">{formatCurrency(p.total_gst)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-bold text-gray-800">{formatCurrency(p.grand_total)}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => navigate(`/purchases/${p._id}`)}
                          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => navigate(`/purchases/${p._id}/edit`)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(p._id, p.bill_no)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Page {page} of {pages} — {total} records
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
