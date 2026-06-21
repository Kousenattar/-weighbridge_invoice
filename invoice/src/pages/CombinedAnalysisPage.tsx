import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { purchasesApi, invoicesApi } from '../api';
import { formatCurrency } from '../utils';
import { PieChart, Receipt, ShoppingCart, IndianRupee, AlertCircle, CheckCircle2, FileText } from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function currentFY() {
  const now = new Date();
  const yr  = now.getFullYear();
  const mo  = now.getMonth();
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

export default function CombinedAnalysisPage() {
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

  // ── sales totals split by type ──────────────────────────────────────────
  const salesRows: any[]  = salesData?.data || [];
  const gstRow    = salesRows.find((r: any) => r._id === 'GST')    || {};
  const nonGstRow = salesRows.find((r: any) => r._id === 'NON_GST') || {};

  const gstSalesAmt    = gstRow.total    || 0;
  const gstSalesCount  = gstRow.count    || 0;
  const gstSalesGST    = (gstRow.cgst || 0) + (gstRow.sgst || 0) + (gstRow.igst || 0);

  const nonGstSalesAmt   = nonGstRow.total   || 0;
  const nonGstSalesCount = nonGstRow.count   || 0;

  const totalSalesAmt   = gstSalesAmt + nonGstSalesAmt;
  const totalSalesCount = gstSalesCount + nonGstSalesCount;

  // ── purchase totals ──────────────────────────────────────────────────────
  const purchOverall     = purchaseData?.data?.overall || {};
  const totalPurchaseGST = purchOverall.total_gst  || 0;
  const totalPurchaseAmt = purchOverall.grand_total || 0;
  const totalPurchCount  = purchOverall.count       || 0;

  const netGST     = gstSalesGST - totalPurchaseGST;
  const netPayable = netGST >= 0;

  const purchMonthly: { month: string; total_gst: number; grand_total: number }[] =
    (purchaseData?.data?.monthly || []).slice(-6).reverse();
  const maxMonthlyGST = Math.max(...purchMonthly.map(m => m.total_gst), 1);

  const maxSales = Math.max(gstSalesAmt, nonGstSalesAmt, 1);

  return (
    <div className="space-y-5 fade-in">

      {/* ── Header + Date Filter ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 font-['Outfit'] flex items-center gap-2">
            <PieChart size={22} className="text-teal-600" /> GST &amp; Non-GST Analysis
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Combined view of all invoice types &amp; purchase GST</p>
        </div>

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
          <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Top 4 summary cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="GST Invoices — Billed"
              value={formatCurrency(gstSalesAmt)}
              sub={`${gstSalesCount} invoice${gstSalesCount !== 1 ? 's' : ''} · GST: ${formatCurrency(gstSalesGST)}`}
              colorClass="bg-blue-50 text-blue-700"
              icon={Receipt}
            />
            <SummaryCard
              label="Non-GST Invoices — Billed"
              value={formatCurrency(nonGstSalesAmt)}
              sub={`${nonGstSalesCount} invoice${nonGstSalesCount !== 1 ? 's' : ''} · No GST`}
              colorClass="bg-teal-50 text-teal-700"
              icon={FileText}
            />
            <SummaryCard
              label="Total Sales (All Types)"
              value={formatCurrency(totalSalesAmt)}
              sub={`${totalSalesCount} total invoices`}
              colorClass="bg-purple-50 text-purple-700"
              icon={IndianRupee}
            />
            <SummaryCard
              label="GST Paid (Purchases)"
              value={formatCurrency(totalPurchaseGST)}
              sub={`${totalPurchCount} bills · ${formatCurrency(totalPurchaseAmt)} purchased`}
              colorClass="bg-emerald-50 text-emerald-700"
              icon={ShoppingCart}
            />
          </div>

          {/* ── Net GST strip ── */}
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
                    ? `GST Payable: ₹${Math.abs(netGST).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                    : `Excess Input Credit: ₹${Math.abs(netGST).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
                  <span className="text-blue-700 font-semibold">{formatCurrency(gstSalesGST)} GST output</span>
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

          {/* ── Side-by-side: Sales split + Monthly purchase chart ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Sales comparison */}
            <div className="card p-4 sm:p-5">
              <h3 className="font-semibold text-gray-700 mb-1">Sales — GST vs Non-GST</h3>
              <p className="text-xs text-gray-400 mb-4">Billed amount comparison by invoice type</p>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                      GST Invoices ({gstSalesCount})
                    </span>
                    <span className="font-bold text-blue-700">{formatCurrency(gstSalesAmt)}</span>
                  </div>
                  <HorizBar value={gstSalesAmt} max={maxSales} color="bg-blue-500" />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                      Non-GST Invoices ({nonGstSalesCount})
                    </span>
                    <span className="font-bold text-teal-700">{formatCurrency(nonGstSalesAmt)}</span>
                  </div>
                  <HorizBar value={nonGstSalesAmt} max={maxSales} color="bg-teal-500" />
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between text-sm font-bold text-gray-700">
                    <span>Total Billed</span>
                    <span className="text-purple-700">{formatCurrency(totalSalesAmt)}</span>
                  </div>
                </div>

                {/* GST collected breakdown */}
                {gstSalesGST > 0 && (
                  <div className="bg-blue-50 rounded-xl p-3 text-xs space-y-1">
                    <p className="font-semibold text-blue-700 mb-1">GST Collected on GST Invoices</p>
                    {salesRows.filter(r => r._id === 'GST').map((r: any, i: number) => (
                      <div key={i} className="flex justify-between text-blue-600">
                        <span>CGST+SGST: {formatCurrency((r.cgst || 0) + (r.sgst || 0))}</span>
                        <span>IGST: {formatCurrency(r.igst || 0)}</span>
                        <span className="font-bold">Total: {formatCurrency(gstSalesGST)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Purchase GST */}
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
