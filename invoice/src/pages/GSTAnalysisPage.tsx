import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { purchasesApi, invoicesApi } from '../api';
import { formatCurrency } from '../utils';
import { BarChart3, Receipt, ShoppingCart, IndianRupee, AlertCircle, CheckCircle2 } from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function currentFY() {
  const now = new Date();
  const yr  = now.getFullYear();
  const mo  = now.getMonth(); // 0-indexed; April = 3
  return mo >= 3
    ? { start: `${yr}-04-01`,     end: `${yr + 1}-03-31` }
    : { start: `${yr - 1}-04-01`, end: `${yr}-03-31` };
}

// ─── sub-components ─────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, colorClass, icon: Icon,
}: {
  label: string; value: string; sub?: string;
  colorClass: string; icon: React.ElementType;
}) {
  return (
    <div className={`card p-4 sm:p-5 flex items-center gap-4 ${colorClass}`}>
      <div className="w-11 h-11 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0">
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70 truncate">{label}</p>
        <p className="text-xl sm:text-2xl font-bold mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs opacity-60 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function HorizBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-5 bg-gray-100 rounded-full overflow-hidden flex-1">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── main ───────────────────────────────────────────────────────────────────

export default function GSTAnalysisPage() {
  const fy = currentFY();
  const [fromDate, setFromDate] = useState(fy.start);
  const [toDate,   setToDate]   = useState(fy.end);

  const params = { from_date: fromDate, to_date: toDate };

  const { data: purchaseData, isLoading: pLoading } = useQuery({
    queryKey: ['purchase-summary', params],
    queryFn:  () => purchasesApi.getSummary(params),
  });

  const { data: salesData, isLoading: sLoading } = useQuery({
    queryKey: ['invoice-summary', params],
    queryFn:  () => invoicesApi.getReportsSummary(params),
  });

  const isLoading = pLoading || sLoading;

  // ── totals ────────────────────────────────────────────────────────────────
  const salesRows: any[]  = salesData?.data || [];
  const totalSalesGST     = salesRows.reduce((s: number, r: any) => s + ((r.cgst || 0) + (r.sgst || 0) + (r.igst || 0)), 0);
  const totalSalesAmt     = salesRows.reduce((s: number, r: any) => s + (r.total || 0), 0);
  const totalSalesCount   = salesRows.reduce((s: number, r: any) => s + (r.count || 0), 0);

  const purchOverall      = purchaseData?.data?.overall || {};
  const totalPurchaseGST  = purchOverall.total_gst  || 0;
  const totalPurchaseAmt  = purchOverall.grand_total || 0;
  const totalPurchaseCount= purchOverall.count       || 0;

  const netGST       = totalSalesGST - totalPurchaseGST;
  const netPayable   = netGST >= 0;

  // ── monthly purchase rows (last 6, newest first) ──────────────────────────
  const purchMonthly: { month: string; total_gst: number; grand_total: number }[] =
    (purchaseData?.data?.monthly || []).slice(-6).reverse();

  const maxMonthlyGST = Math.max(...purchMonthly.map(m => m.total_gst), 1);

  return (
    <div className="space-y-5 fade-in">

      {/* ── Header + Date Filter ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 font-['Outfit'] flex items-center gap-2">
            <BarChart3 size={22} className="text-purple-600" /> GST Analysis
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Output tax collected vs input credit paid</p>
        </div>

        {/* Date picker — stacks on mobile */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-xs text-gray-400 font-medium shrink-0">From</span>
            <input type="date" className="text-sm text-gray-700 outline-none bg-transparent w-full"
              value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-xs text-gray-400 font-medium shrink-0">To</span>
            <input type="date" className="text-sm text-gray-700 outline-none bg-transparent w-full"
              value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <button
            onClick={() => { setFromDate(fy.start); setToDate(fy.end); }}
            className="btn-outline text-xs py-2 whitespace-nowrap"
          >
            This FY
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-52">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── 3 summary cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              label="GST Collected (Sales)"
              value={formatCurrency(totalSalesGST)}
              sub={`${totalSalesCount} invoices · ${formatCurrency(totalSalesAmt)} billed`}
              colorClass="bg-blue-50 text-blue-700"
              icon={Receipt}
            />
            <SummaryCard
              label="GST Paid (Purchases)"
              value={formatCurrency(totalPurchaseGST)}
              sub={`${totalPurchaseCount} bills · ${formatCurrency(totalPurchaseAmt)} purchased`}
              colorClass="bg-emerald-50 text-emerald-700"
              icon={ShoppingCart}
            />
            <SummaryCard
              label={netPayable ? 'Net GST Payable' : 'Excess Input Credit'}
              value={formatCurrency(Math.abs(netGST))}
              sub={netPayable ? 'Amount due to government' : 'Carry forward to next period'}
              colorClass={netPayable ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-purple-700'}
              icon={IndianRupee}
            />
          </div>

          {/* ── Net GST calculation strip ── */}
          <div className={`card p-4 sm:p-5 border-l-4 ${
            netPayable ? 'border-l-amber-400 bg-amber-50/60' : 'border-l-emerald-400 bg-emerald-50/60'
          }`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {netPayable
                  ? <AlertCircle size={18} className="text-amber-500" />
                  : <CheckCircle2 size={18} className="text-emerald-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${netPayable ? 'text-amber-800' : 'text-emerald-800'}`}>
                  {netPayable
                    ? `You owe ₹${Math.abs(netGST).toLocaleString('en-IN', { maximumFractionDigits: 2 })} in GST to the government`
                    : `You have ₹${Math.abs(netGST).toLocaleString('en-IN', { maximumFractionDigits: 2 })} as excess input credit`}
                </p>
                {/* formula */}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
                  <span className="text-blue-700 font-semibold">{formatCurrency(totalSalesGST)} output</span>
                  <span className="text-gray-400">−</span>
                  <span className="text-emerald-700 font-semibold">{formatCurrency(totalPurchaseGST)} input credit</span>
                  <span className="text-gray-400">=</span>
                  <span className={`font-bold ${netPayable ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {netPayable ? '' : '−'}{formatCurrency(Math.abs(netGST))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── GST type breakdown + Monthly purchase chart side-by-side on larger screens ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Sales GST Breakdown */}
            <div className="card p-4 sm:p-5">
              <h3 className="font-semibold text-gray-700 mb-1">Sales GST — By Type</h3>
              <p className="text-xs text-gray-400 mb-4">CGST · SGST · IGST collected on invoices</p>

              {salesRows.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">No sales data in this period</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left p-2 text-xs text-gray-500 font-semibold">Type</th>
                        <th className="text-right p-2 text-xs text-gray-500 font-semibold">Bills</th>
                        <th className="text-right p-2 text-xs text-gray-500 font-semibold">CGST+SGST</th>
                        <th className="text-right p-2 text-xs text-gray-500 font-semibold">IGST</th>
                        <th className="text-right p-2 text-xs text-gray-500 font-semibold">Total GST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesRows.map((r: any, i: number) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="p-2">
                            <span className={`badge text-xs ${r._id === 'GST' ? 'badge-gst' : 'badge-nonGst'}`}>
                              {r._id === 'GST' ? 'GST Invoice' : 'Non-GST Invoice'}
                            </span>
                          </td>
                          <td className="p-2 text-right text-gray-600">{r.count}</td>
                          <td className="p-2 text-right text-gray-600">
                            {formatCurrency((r.cgst || 0) + (r.sgst || 0))}
                          </td>
                          <td className="p-2 text-right text-gray-600">{formatCurrency(r.igst || 0)}</td>
                          <td className="p-2 text-right font-bold text-blue-700">
                            {formatCurrency((r.cgst || 0) + (r.sgst || 0) + (r.igst || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50">
                        <td className="p-2 font-bold text-gray-700">Total</td>
                        <td className="p-2 text-right font-bold text-gray-700">{totalSalesCount}</td>
                        <td className="p-2" colSpan={2}></td>
                        <td className="p-2 text-right font-bold text-blue-700">{formatCurrency(totalSalesGST)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Monthly Purchase GST bar chart */}
            <div className="card p-4 sm:p-5">
              <h3 className="font-semibold text-gray-700 mb-1">Monthly Purchase GST</h3>
              <p className="text-xs text-gray-400 mb-4">Input credit paid — last 6 months</p>

              {purchMonthly.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">No purchase data in this period</p>
              ) : (
                <div className="space-y-3">
                  {purchMonthly.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs text-gray-500 w-14 sm:w-16 shrink-0 truncate">{m.month}</span>
                      <HorizBar value={m.total_gst} max={maxMonthlyGST} color="bg-emerald-500" />
                      <span className="text-xs text-emerald-700 font-semibold w-20 sm:w-24 text-right shrink-0">
                        {formatCurrency(m.total_gst)}
                      </span>
                    </div>
                  ))}
                  {/* total row */}
                  <div className="flex items-center gap-2 sm:gap-3 border-t border-gray-100 pt-2 mt-1">
                    <span className="text-xs font-bold text-gray-600 w-14 sm:w-16 shrink-0">Total</span>
                    <div className="flex-1" />
                    <span className="text-xs font-bold text-emerald-700 w-20 sm:w-24 text-right shrink-0">
                      {formatCurrency(purchMonthly.reduce((s, m) => s + m.total_gst, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
