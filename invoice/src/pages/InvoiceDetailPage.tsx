import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi, settingsApi } from '../api';
import { formatCurrency, formatDate } from '../utils';
import { ArrowLeft, Download, Copy, Trash2, Printer, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Invoice, CompanySettings } from '../types';

function InvoicePrintView({ invoice, company }: { invoice: Invoice; company: CompanySettings }) {
  const isGST = invoice.invoice_type === 'GST';
  const isCGST = invoice.gst_type === 'CGST_SGST';
  const isIGST = invoice.gst_type === 'IGST';
  const c = invoice.client;

  const fmtCur = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(n);

  return (
    <div className="invoice-preview" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000', border: '2px solid #1a3a6b', padding: '12px', maxWidth: '794px', margin: '0 auto', background: '#fff' }}>
      {isGST && <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '4px' }}>GSTIN :{company.gst_number}</div>}
      {isGST && <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', padding: '4px 0' }}>TAX INVOICE</div>}
      <div style={{ background: '#1a3a6b', color: '#fff', textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>{company.company_name}</div>
        <div style={{ fontSize: '10px', marginTop: '2px' }}>{company.address}</div>
        <div style={{ fontSize: '10px' }}>Email Id:- {company.email} &nbsp; Mobile No. {company.mobile}</div>
      </div>
      <div style={{ textAlign: 'center', color: '#cc0000', fontSize: '10px', fontWeight: 'bold', borderTop: '1px solid #1a3a6b', borderBottom: '1px solid #1a3a6b', padding: '3px 0' }}>
        {company.specialist_text}
      </div>

      {/* Client + Invoice Info */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #1a3a6b' }}>
        <tbody>
          <tr>
            <td style={{ width: '60%', borderRight: '1px solid #1a3a6b', padding: '6px', verticalAlign: 'top' }}>
              <table style={{ width: '100%' }}>
                <tbody>
                  <tr><td style={{ fontWeight: 'bold', width: '100px', fontSize: '10.5px' }}>Party Name</td><td style={{ fontSize: '10.5px' }}>: {c.client_name}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', verticalAlign: 'top', fontSize: '10.5px' }}>Address</td><td style={{ fontSize: '10.5px' }}>: {c.address}</td></tr>
                  {isGST ? <tr><td style={{ fontWeight: 'bold', fontSize: '10.5px' }}>Party GST NO</td><td style={{ fontSize: '10.5px' }}>: {c.gst_number}</td></tr>
                    : <tr><td style={{ fontWeight: 'bold', fontSize: '10.5px' }}>State</td><td style={{ fontSize: '10.5px' }}>: {c.state}</td></tr>}
                  <tr><td style={{ fontWeight: 'bold', fontSize: '10.5px' }}>State Code</td><td style={{ fontSize: '10.5px' }}>: {c.state_code}</td></tr>
                  {isIGST && <tr><td style={{ fontWeight: 'bold', fontSize: '10.5px' }}>E-Way Bill</td><td style={{ fontSize: '10.5px' }}>: {invoice.eway_bill || ''}</td></tr>}
                </tbody>
              </table>
            </td>
            <td style={{ width: '40%', padding: '6px', verticalAlign: 'top' }}>
              <table style={{ width: '100%' }}>
                <tbody>
                  <tr><td style={{ fontWeight: 'bold', fontSize: '10.5px', width: '80px' }}>Invoice No.</td><td style={{ fontSize: '10.5px' }}>: {invoice.invoice_number}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', fontSize: '10.5px' }}>Date</td><td style={{ fontSize: '10.5px' }}>: {formatDate(invoice.invoice_date)}</td></tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#1a3a6b', color: '#fff' }}>
            {['S.NO.', 'Item Name', 'HS CODE', 'Qty', 'Rate', 'Total Amount'].map((h, i) => (
              <th key={i} style={{ padding: '5px 4px', fontSize: '10.5px', border: '1px solid #6b8cbf', textAlign: i === 1 ? 'left' : 'center' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #b0c4de', padding: '3px 4px', textAlign: 'center' }}>{item.sr_no}</td>
              <td style={{ border: '1px solid #b0c4de', padding: '3px 4px', fontSize: '10px' }}>{item.item_name}</td>
              <td style={{ border: '1px solid #b0c4de', padding: '3px 4px', textAlign: 'center' }}>{item.hsn_code}</td>
              <td style={{ border: '1px solid #b0c4de', padding: '3px 4px', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ border: '1px solid #b0c4de', padding: '3px 4px', textAlign: 'right' }}>{fmtCur(item.rate)}</td>
              <td style={{ border: '1px solid #b0c4de', padding: '3px 4px', textAlign: 'right' }}>{fmtCur(item.amount)}</td>
            </tr>
          ))}
          {Array(Math.max(0, 6 - invoice.items.length)).fill(null).map((_, i) => (
            <tr key={`blank-${i}`}>
              <td style={{ border: '1px solid #b0c4de', padding: '12px 4px' }}>&nbsp;</td>
              <td style={{ border: '1px solid #b0c4de' }}></td>
              <td style={{ border: '1px solid #b0c4de' }}></td>
              <td style={{ border: '1px solid #b0c4de' }}></td>
              <td style={{ border: '1px solid #b0c4de' }}></td>
              <td style={{ border: '1px solid #b0c4de' }}></td>
            </tr>
          ))}
          <tr style={{ background: '#eef2ff', fontWeight: 'bold', borderTop: '2px solid #1a3a6b' }}>
            <td colSpan={3} style={{ padding: '4px' }}></td>
            <td style={{ padding: '4px', textAlign: 'center' }}>Total Qty. {invoice.items.reduce((s, i) => s + i.quantity, 0)}</td>
            <td style={{ padding: '4px', textAlign: 'right' }}>Amount</td>
            <td style={{ padding: '4px', textAlign: 'right' }}>{fmtCur(invoice.subtotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Summary */}
      <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid #1a3a6b' }}>
        <tbody>
          <tr>
            <td style={{ width: '50%', borderRight: '1px solid #1a3a6b', padding: '8px', verticalAlign: 'top' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                {isGST ? 'Amount in Words -' : 'Amount In Words:'}&nbsp;
                <span style={{ fontWeight: 'normal', fontSize: '12px' }}>{invoice.amount_in_words}</span>
              </div>
            </td>
            <td style={{ width: '50%', padding: '4px', verticalAlign: 'top' }}>
              <table style={{ width: '100%' }}>
                <tbody>
                  {isGST && isCGST && <>
                    <tr><td style={{ textAlign: 'right', fontWeight: 'bold', color: '#1a3a6b', fontSize: '10px', width: '60%' }}>SGST @ {invoice.sgst_rate}.00%</td><td style={{ textAlign: 'right' }}>{fmtCur(invoice.sgst_amount)}</td></tr>
                    <tr><td style={{ textAlign: 'right', fontWeight: 'bold', color: '#1a3a6b', fontSize: '10px' }}>CGST @ {invoice.cgst_rate}.00%</td><td style={{ textAlign: 'right' }}>{fmtCur(invoice.cgst_amount)}</td></tr>
                  </>}
                  {isGST && isIGST && <tr><td style={{ textAlign: 'right', color: '#00a', textDecoration: 'underline', fontWeight: 'bold', fontSize: '10px', width: '60%' }}>IGST@ {invoice.igst_rate}.00%</td><td style={{ textAlign: 'right' }}>{fmtCur(invoice.igst_amount)}</td></tr>}
                  {!isGST && <>
                    <tr><td style={{ textAlign: 'right', fontWeight: 'bold', color: '#1a3a6b', fontSize: '10px', width: '60%' }}>SGST @ 0.00%</td><td style={{ textAlign: 'right' }}>000.00</td></tr>
                    <tr><td style={{ textAlign: 'right', fontWeight: 'bold', color: '#1a3a6b', fontSize: '10px' }}>CGST @ 0.00%</td><td style={{ textAlign: 'right' }}>000.00</td></tr>
                  </>}
                  <tr style={{ borderTop: '2px solid #1a3a6b' }}>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '11px', color: '#1a3a6b' }}>Total<br />Amount</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>₹ {fmtCur(invoice.grand_total)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bank Details */}
      <div style={{ borderTop: '1px solid #1a3a6b', padding: '4px 6px', fontSize: '9.5px' }}>
        Bank Details :- {company.bank_name} , Name-{company.account_holder} , A/C No - {company.account_number}, IFSC – {company.ifsc}
      </div>

      {/* Footer */}
      <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid #1a3a6b', marginTop: '4px' }}>
        <tbody>
          <tr>
            <td style={{ width: '65%', borderRight: '1px solid #1a3a6b', padding: '4px 6px', verticalAlign: 'top', fontSize: '9.5px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '3px', fontSize: '10px' }}>Terms & Conditions</div>
              {(company.terms || []).map((t, i) => <div key={i}>{i + 1}. {t}</div>)}
            </td>
            <td style={{ width: '35%', padding: '4px 6px', textAlign: 'center', verticalAlign: 'top', fontSize: '9.5px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '10px' }}>FOR {company.company_name}</div>
              <div style={{ marginTop: '30px', borderTop: '1px solid #000', paddingTop: '4px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{company.signatory_name}</div>
                <div>Authorized Signatory</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: invData, isLoading } = useQuery({ queryKey: ['invoice', id], queryFn: () => invoicesApi.getById(id!) });
  const { data: settingsData } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });

  const invoice: Invoice = invData?.data;
  const company: CompanySettings = settingsData?.data;

  const deleteMutation = useMutation({
    mutationFn: () => invoicesApi.delete(id!),
    onSuccess: () => { toast.success('Invoice deleted'); navigate('/invoices'); queryClient.invalidateQueries({ queryKey: ['invoices'] }); },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => invoicesApi.duplicate(id!),
    onSuccess: (res) => { toast.success(`Duplicated as ${res.data.invoice_number}`); navigate(`/invoices/${res.data._id}`); queryClient.invalidateQueries({ queryKey: ['invoices'] }); },
  });

  if (isLoading) return <div className="card p-8 skeleton h-96 fade-in"></div>;
  if (!invoice) return <div className="card p-8 text-center text-gray-500">Invoice not found</div>;

  return (
    <div className="space-y-4 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 no-print">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={() => navigate('/invoices')} className="btn-outline p-2 flex-shrink-0"><ArrowLeft size={16} /></button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800 font-['Outfit'] truncate">{invoice.invoice_number}</h1>
            <p className="text-gray-500 text-sm">{formatDate(invoice.invoice_date)}</p>
          </div>
        </div>
        {/* Action buttons — horizontally scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
          <button onClick={() => window.print()} className="btn-outline flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm"><Printer size={13} /> Print</button>
          <button onClick={() => navigate(`/invoices/${id}/edit`)} className="btn-outline flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm" style={{ borderColor: '#6366f1', color: '#6366f1' }}><Edit2 size={13} /> Edit</button>
          <button onClick={() => duplicateMutation.mutate()} className="btn-outline flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm"><Copy size={13} /> Duplicate</button>
          <button onClick={() => deleteMutation.mutate()} className="btn-danger flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm"><Trash2 size={13} /> Delete</button>
        </div>
      </div>

      <div className="card p-3 sm:p-6 overflow-x-auto">
        <div style={{ minWidth: '580px' }}>
          {company && <InvoicePrintView invoice={invoice} company={company} />}
        </div>
      </div>
    </div>
  );
}
