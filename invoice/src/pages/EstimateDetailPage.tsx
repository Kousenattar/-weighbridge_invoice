import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { estimatesApi, settingsApi } from '../api';
import { ArrowLeft, Download, Trash2, ClipboardList, CheckCircle, XCircle, Send, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

function EstimatePrintView({ estimate, company }: { estimate: any; company: any }) {
  const isCGST = estimate.gst_type === 'CGST_SGST';
  const isIGST = estimate.gst_type === 'IGST';
  const isGST = isCGST || isIGST;

  const fmtCur = (n: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

  const fmtDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getDate()).padStart(2,'0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
  };

  const blankCount = Math.max(0, 2 - estimate.items.length);

  return (
    <div className="invoice-preview" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10.5px', color: '#000', width: '100%', maxWidth: '794px', margin: '0 auto', background: '#fff', border: '2px solid #1a3a6b', padding: '12px' }}>
      
      {/* Company Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1a3a6b' }}>{company.company_name}</div>
          <div style={{ fontSize: '9.5px', marginTop: '3px', lineHeight: '1.5', color: '#333' }}>
            {company.address ? company.address.split(',').map((addr: string, i: number) => (
              <span key={i}>{addr.trim()},{i < company.address.split(',').length - 1 && <br />}</span>
            )) : null}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '9.5px', lineHeight: '1.7' }}>
          <strong>Name :</strong> {company.signatory_name}<br />
          <strong>Phone :</strong> {company.mobile}<br />
          <strong>Email:</strong> {company.email}
        </div>
      </div>

      {/* GSTIN + Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '2px solid #1a3a6b', padding: '5px 8px', marginBottom: '0' }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>GSTIN : {company.gst_number}</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e60000', letterSpacing: '1px' }}>Quotation</div>
      </div>

      {/* Client + Quote Meta */}
      <div style={{ border: '1px solid #1a3a6b', borderTop: 'none', display: 'flex' }}>
        <div style={{ flex: 1, padding: '6px 8px', borderRight: '1px solid #1a3a6b' }}>
          <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '4px', borderBottom: '1px solid #cce', paddingBottom: '3px' }}>Customer Detail</div>
          <div style={{ display: 'flex', marginBottom: '2px', fontSize: '10px' }}>
            <span style={{ fontWeight: 'bold', width: '100px', flexShrink: 0 }}>M/S</span>
            <span>{estimate.client_name}</span>
          </div>
          <div style={{ display: 'flex', marginBottom: '2px', fontSize: '10px' }}>
            <span style={{ fontWeight: 'bold', width: '100px', flexShrink: 0 }}>Address</span>
            <span style={{ whiteSpace: 'pre-line' }}>{estimate.client_address}</span>
          </div>
          <div style={{ display: 'flex', marginBottom: '2px', fontSize: '10px' }}>
            <span style={{ fontWeight: 'bold', width: '100px', flexShrink: 0 }}>PHONE</span>
            <span>{estimate.client_phone}</span>
          </div>
          <div style={{ display: 'flex', marginBottom: '2px', fontSize: '10px' }}>
            <span style={{ fontWeight: 'bold', width: '100px', flexShrink: 0 }}>GSTIN</span>
            <span>{estimate.client_gst}</span>
          </div>
          <div style={{ display: 'flex', marginBottom: '2px', fontSize: '10px' }}>
            <span style={{ fontWeight: 'bold', width: '100px', flexShrink: 0 }}>Place of Supply</span>
            <span>{estimate.place_of_supply}</span>
          </div>
        </div>
        <div style={{ width: '45%', padding: '6px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '10px' }}>
            <span style={{ fontWeight: 'bold' }}>Quotation No.</span>
            <span>{estimate.estimate_number}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '10px' }}>
            <span style={{ fontWeight: 'bold' }}>Quotation Date</span>
            <span>{fmtDate(estimate.estimate_date)}</span>
          </div>
          {estimate.valid_until && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '10px' }}>
              <span style={{ fontWeight: 'bold' }}>Valid Until</span>
              <span>{fmtDate(estimate.valid_until)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 0 }}>
        <thead>
          <tr style={{ background: '#1a3a6b', color: '#fff' }}>
            <th style={{ width: '4%', padding: '5px 3px', fontSize: '9.5px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #6b8cbf' }}>Sr.<br />No.</th>
            <th style={{ width: '32%', padding: '5px 3px 5px 5px', fontSize: '9.5px', fontWeight: 'bold', textAlign: 'left', border: '1px solid #6b8cbf' }}>Name of Product / Service</th>
            <th style={{ width: '8%', padding: '5px 3px', fontSize: '9.5px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #6b8cbf' }}>HSN /<br />SAC</th>
            <th style={{ width: '6%', padding: '5px 3px', fontSize: '9.5px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #6b8cbf' }}>Qty</th>
            <th style={{ width: '10%', padding: '5px 3px', fontSize: '9.5px', fontWeight: 'bold', textAlign: 'right', border: '1px solid #6b8cbf' }}>Rate</th>
            <th style={{ width: '11%', padding: '5px 3px', fontSize: '9.5px', fontWeight: 'bold', textAlign: 'right', border: '1px solid #6b8cbf' }}>Taxable<br />Value</th>
            {isCGST && (
              <>
                <th style={{ width: '10%', padding: '5px 3px', fontSize: '9.5px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #6b8cbf' }}>CGST</th>
                <th style={{ width: '10%', padding: '5px 3px', fontSize: '9.5px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #6b8cbf' }}>SGST</th>
              </>
            )}
            {isIGST && <th colSpan={2} style={{ width: '20%', padding: '5px 3px', fontSize: '9.5px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #6b8cbf' }}>IGST</th>}
            {!isGST && (
              <>
                <th style={{ width: '10%', padding: '5px 3px', fontSize: '9.5px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #6b8cbf' }}>CGST</th>
                <th style={{ width: '10%', padding: '5px 3px', fontSize: '9.5px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #6b8cbf' }}>SGST</th>
              </>
            )}
            <th style={{ width: '10%', padding: '5px 3px', fontSize: '9.5px', fontWeight: 'bold', textAlign: 'right', border: '1px solid #6b8cbf' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {estimate.items.map((item: any, idx: number) => {
            const taxVal = item.taxable_value || 0;
            const cgstAmt = item.cgst_amount || 0;
            const sgstAmt = item.sgst_amount || 0;
            const igstAmt = item.igst_amount || 0;
            return (
              <tr key={idx} style={{ background: idx % 2 === 1 ? '#f5f8ff' : '#fff' }}>
                <td style={{ border: '1px solid #b0c4de', padding: '3px 3px', textAlign: 'center', fontSize: '9.5px', verticalAlign: 'top' }}>{item.sr_no || idx + 1}</td>
                <td style={{ border: '1px solid #b0c4de', padding: '3px 3px 3px 5px', fontSize: '9.5px', verticalAlign: 'top', whiteSpace: 'pre-line' }}>{item.item_name}</td>
                <td style={{ border: '1px solid #b0c4de', padding: '3px 3px', textAlign: 'center', fontSize: '9.5px', verticalAlign: 'top' }}>{item.hsn_code || ''}</td>
                <td style={{ border: '1px solid #b0c4de', padding: '3px 3px', textAlign: 'center', fontSize: '9.5px', verticalAlign: 'top' }}>{item.quantity}</td>
                <td style={{ border: '1px solid #b0c4de', padding: '3px 3px', textAlign: 'right', fontSize: '9.5px', verticalAlign: 'top' }}>{fmtCur(item.rate)}</td>
                <td style={{ border: '1px solid #b0c4de', padding: '3px 3px', textAlign: 'right', fontSize: '9.5px', verticalAlign: 'top' }}>{fmtCur(taxVal)}</td>
                {isCGST && (
                  <>
                    <td style={{ border: '1px solid #b0c4de', padding: '3px 3px', textAlign: 'center', fontSize: '9.5px', verticalAlign: 'top' }}>
                      {item.cgst_rate || 0}%<br /><span style={{ fontSize: '8.5px', display: 'block' }}>{fmtCur(cgstAmt)}</span>
                    </td>
                    <td style={{ border: '1px solid #b0c4de', padding: '3px 3px', textAlign: 'center', fontSize: '9.5px', verticalAlign: 'top' }}>
                      {item.sgst_rate || 0}%<br /><span style={{ fontSize: '8.5px', display: 'block' }}>{fmtCur(sgstAmt)}</span>
                    </td>
                  </>
                )}
                {isIGST && (
                  <td colSpan={2} style={{ border: '1px solid #b0c4de', padding: '3px 3px', textAlign: 'center', fontSize: '9.5px', verticalAlign: 'top' }}>
                    {item.igst_rate || 0}%<br /><span style={{ fontSize: '8.5px', display: 'block' }}>{fmtCur(igstAmt)}</span>
                  </td>
                )}
                {!isGST && (
                  <>
                    <td style={{ border: '1px solid #b0c4de', padding: '3px 3px', textAlign: 'center', fontSize: '9.5px', verticalAlign: 'top' }}>—</td>
                    <td style={{ border: '1px solid #b0c4de', padding: '3px 3px', textAlign: 'center', fontSize: '9.5px', verticalAlign: 'top' }}>—</td>
                  </>
                )}
                <td style={{ border: '1px solid #b0c4de', padding: '3px 3px', textAlign: 'right', fontWeight: 'bold', fontSize: '9.5px', verticalAlign: 'top' }}>{fmtCur(item.total)}</td>
              </tr>
            );
          })}
          {Array(blankCount).fill(null).map((_, i) => (
            <tr key={`blank-${i}`} style={{ height: '28px' }}>
              <td style={{ border: '1px solid #b0c4de' }}></td>
              <td style={{ border: '1px solid #b0c4de' }}></td>
              <td style={{ border: '1px solid #b0c4de' }}></td>
              <td style={{ border: '1px solid #b0c4de' }}></td>
              <td style={{ border: '1px solid #b0c4de' }}></td>
              <td style={{ border: '1px solid #b0c4de' }}></td>
              <td style={{ border: '1px solid #b0c4de' }}></td>
              <td style={{ border: '1px solid #b0c4de' }}></td>
              <td style={{ border: '1px solid #b0c4de' }}></td>
            </tr>
          ))}
          <tr style={{ fontWeight: 'bold', fontSize: '10px' }}>
            <td colSpan={3} style={{ borderTop: '2px solid #1a3a6b', borderBottom: '2px solid #1a3a6b', background: '#eef2ff', padding: '4px 3px' }}></td>
            <td style={{ borderTop: '2px solid #1a3a6b', borderBottom: '2px solid #1a3a6b', background: '#eef2ff', padding: '4px 3px', textAlign: 'center' }}>Total</td>
            <td style={{ borderTop: '2px solid #1a3a6b', borderBottom: '2px solid #1a3a6b', background: '#eef2ff', padding: '4px 3px' }}></td>
            <td style={{ borderTop: '2px solid #1a3a6b', borderBottom: '2px solid #1a3a6b', background: '#eef2ff', padding: '4px 3px', textAlign: 'right' }}>{fmtCur(estimate.subtotal)}</td>
            <td style={{ borderTop: '2px solid #1a3a6b', borderBottom: '2px solid #1a3a6b', background: '#eef2ff', padding: '4px 3px', textAlign: 'right' }}>{isGST ? fmtCur(estimate.cgst_amount || estimate.igst_amount) : '—'}</td>
            <td style={{ borderTop: '2px solid #1a3a6b', borderBottom: '2px solid #1a3a6b', background: '#eef2ff', padding: '4px 3px', textAlign: 'right' }}>{isCGST ? fmtCur(estimate.sgst_amount) : '—'}</td>
            <td style={{ borderTop: '2px solid #1a3a6b', borderBottom: '2px solid #1a3a6b', background: '#eef2ff', padding: '4px 3px', textAlign: 'right' }}>{fmtCur(estimate.grand_total)}</td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ display: 'flex', border: '1px solid #1a3a6b', borderTop: '2px solid #1a3a6b', marginTop: '-1px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ flex: 1, borderRight: '1px solid #1a3a6b' }}>
          <div style={{ padding: '5px 8px', borderBottom: '1px solid #1a3a6b', fontSize: '10px', fontWeight: 'bold' }}>
            <div style={{ fontSize: '9px', color: '#555', marginBottom: '2px' }}>Total in words</div>
            <div>{estimate.amount_in_words}</div>
          </div>
          <div style={{ padding: '5px 8px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '10px', borderBottom: '1px solid #b0c4de', marginBottom: '3px', paddingBottom: '2px' }}>Bank Details</div>
            <div style={{ display: 'flex', marginBottom: '2px', fontSize: '9.5px' }}><span style={{ fontWeight: 'bold', width: '80px', flexShrink: 0 }}>Name</span><span>{company.bank_name}</span></div>
            <div style={{ display: 'flex', marginBottom: '2px', fontSize: '9.5px' }}><span style={{ fontWeight: 'bold', width: '80px', flexShrink: 0 }}>Branch</span><span>{company.branch || 'Main Branch'}</span></div>
            <div style={{ display: 'flex', marginBottom: '2px', fontSize: '9.5px' }}><span style={{ fontWeight: 'bold', width: '80px', flexShrink: 0 }}>Acc. Number</span><span>{company.account_number}</span></div>
            <div style={{ display: 'flex', marginBottom: '2px', fontSize: '9.5px' }}><span style={{ fontWeight: 'bold', width: '80px', flexShrink: 0 }}>IFSC</span><span>{company.ifsc}</span></div>
          </div>
          {estimate.notes && (
            <div style={{ padding: '5px 8px', borderTop: '1px solid #1a3a6b', fontSize: '9px', lineHeight: '1.5' }}>
              <div style={{ fontWeight: 'bold', fontSize: '9.5px', marginBottom: '3px' }}>Notes / Terms</div>
              <p style={{ fontSize: '9px', margin: 0, whiteSpace: 'pre-line' }}>{estimate.notes}</p>
            </div>
          )}
        </div>

        <div style={{ width: '42%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 8px', fontSize: '9.5px', borderBottom: '1px solid #e0e8f0', fontWeight: 'bold', color: '#1a3a6b', textAlign: 'right' }}>Taxable Amount</td>
                <td style={{ padding: '3px 8px', fontSize: '9.5px', borderBottom: '1px solid #e0e8f0', textAlign: 'right', fontWeight: 600 }}>{fmtCur(estimate.subtotal)}</td>
              </tr>
              {isCGST && (
                <>
                  <tr>
                    <td style={{ padding: '3px 8px', fontSize: '9.5px', borderBottom: '1px solid #e0e8f0', fontWeight: 'bold', color: '#1a3a6b', textAlign: 'right' }}>Add : CGST</td>
                    <td style={{ padding: '3px 8px', fontSize: '9.5px', borderBottom: '1px solid #e0e8f0', textAlign: 'right', fontWeight: 600 }}>{fmtCur(estimate.cgst_amount)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 8px', fontSize: '9.5px', borderBottom: '1px solid #e0e8f0', fontWeight: 'bold', color: '#1a3a6b', textAlign: 'right' }}>Add : SGST</td>
                    <td style={{ padding: '3px 8px', fontSize: '9.5px', borderBottom: '1px solid #e0e8f0', textAlign: 'right', fontWeight: 600 }}>{fmtCur(estimate.sgst_amount)}</td>
                  </tr>
                </>
              )}
              {isIGST && (
                <tr>
                  <td style={{ padding: '3px 8px', fontSize: '9.5px', borderBottom: '1px solid #e0e8f0', fontWeight: 'bold', color: '#1a3a6b', textAlign: 'right' }}>Add : IGST</td>
                  <td style={{ padding: '3px 8px', fontSize: '9.5px', borderBottom: '1px solid #e0e8f0', textAlign: 'right', fontWeight: 600 }}>{fmtCur(estimate.igst_amount)}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '3px 8px', fontSize: '9.5px', borderBottom: '1px solid #e0e8f0', fontWeight: 'bold', color: '#1a3a6b', textAlign: 'right' }}>Total Tax</td>
                <td style={{ padding: '3px 8px', fontSize: '9.5px', borderBottom: '1px solid #e0e8f0', textAlign: 'right', fontWeight: 600 }}>{fmtCur(estimate.total_tax)}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 8px', fontSize: '9.5px', borderBottom: '1px solid #e0e8f0', fontWeight: 'bold', color: '#1a3a6b', textAlign: 'right' }}>Round off Amount</td>
                <td style={{ padding: '3px 8px', fontSize: '9.5px', borderBottom: '1px solid #e0e8f0', textAlign: 'right', fontWeight: 600 }}>{fmtCur(estimate.round_off || 0)}</td>
              </tr>
              <tr style={{ borderTop: '2px solid #1a3a6b', fontWeight: 'bold', fontSize: '11px' }}>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: '#1a3a6b' }}>Total Amount After Tax</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: '#1a3a6b' }}>₹{fmtCur(estimate.grand_total)}</td>
              </tr>
              <tr>
                <td colSpan={2} style={{ textAlign: 'center', fontSize: '8.5px', color: '#555', padding: '3px 8px' }}>(E &amp; O.E.)</td>
              </tr>
            </tbody>
          </table>

          <div style={{ padding: '8px', textAlign: 'center', borderTop: '1px solid #1a3a6b', fontSize: '9.5px' }}>
            <div style={{ fontWeight: 'bold' }}>Certified that the particulars given above<br />For {company.company_name}</div>
            <div style={{ marginTop: '30px', borderTop: '1px solid #000', paddingTop: '3px', fontWeight: 'bold', fontSize: '10px' }}>Authorised Signatory</div>
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div style={{ border: '1px solid #1a3a6b', borderTop: '2px solid #1a3a6b', marginTop: '10px', padding: '6px 8px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ fontWeight: 'bold', fontSize: '10.5px', color: '#1a3a6b', marginBottom: '5px', borderBottom: '1px solid #b0c4de', paddingBottom: '3px', letterSpacing: '0.5px' }}>Terms &amp; Conditions</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li style={{ fontSize: '9px', lineHeight: '1.6', marginBottom: '2px', display: 'flex', gap: '5px' }}>
            <span style={{ fontWeight: 'bold', color: '#1a3a6b', flexShrink: 0, minWidth: '14px' }}>1.</span>
            <span style={{ flex: 1 }}>Subject to our Sangli Jurisdiction.</span>
          </li>
          <li style={{ fontSize: '9px', lineHeight: '1.6', marginBottom: '2px', display: 'flex', gap: '5px' }}>
            <span style={{ fontWeight: 'bold', color: '#1a3a6b', flexShrink: 0, minWidth: '14px' }}>2.</span>
            <span style={{ flex: 1 }}>One year warranty against Manufacturing defects only.</span>
          </li>
          <li style={{ fontSize: '9px', lineHeight: '1.6', marginBottom: '2px', display: 'flex', gap: '5px' }}>
            <span style={{ fontWeight: 'bold', color: '#1a3a6b', flexShrink: 0, minWidth: '14px' }}>3.</span>
            <span style={{ fontWeight: 'bold', flexShrink: 0 }}>Delivery :</span>
            <span style={{ flex: 1 }}>2 to 3 weeks from Date of Receipt of Purchase Order &amp; Advance.</span>
          </li>
          <li style={{ fontSize: '9px', lineHeight: '1.6', marginBottom: '2px', display: 'flex', gap: '5px' }}>
            <span style={{ fontWeight: 'bold', color: '#1a3a6b', flexShrink: 0, minWidth: '14px' }}>4.</span>
            <span style={{ fontWeight: 'bold', flexShrink: 0 }}>Customer's Scope :</span>
            <span style={{ flex: 1 }}>Crane at time of installation, Weights arrangement if required at time of Stamping, Civil Construction as per Our Drawing, Local Welder, Labour at time of installation, 1 Phase Supply with Earthing, Battery Inverter, Table.</span>
          </li>
          <li style={{ fontSize: '9px', lineHeight: '1.6', marginBottom: '2px', display: 'flex', gap: '5px' }}>
            <span style={{ fontWeight: 'bold', color: '#1a3a6b', flexShrink: 0, minWidth: '14px' }}>5.</span>
            <span style={{ fontWeight: 'bold', flexShrink: 0 }}>Payment :</span>
            <span style={{ flex: 1 }}>70% Advance, 20% Against Proforma, 10% Against installation and testing and before Passing.</span>
          </li>
        </ul>
      </div>

    </div>
  );
}

export default function EstimateDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [downloading, setDownloading] = useState(false);

  const shouldPrint = searchParams.get('print') === 'true';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['estimate', id],
    queryFn:  () => estimatesApi.getById(id!),
    enabled:  !!id,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn:  () => settingsApi.get(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => estimatesApi.update(id!, { ...est, items: est.items, status }),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => estimatesApi.delete(id!),
    onSuccess: () => {
      toast.success('Estimate deleted');
      navigate('/estimates');
    },
  });

  const handleDownload = async () => {
    if (!est) return;
    setDownloading(true);
    try {
      await estimatesApi.downloadPDF(id!, est.estimate_number);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Could not generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = () => {
    if (!window.confirm('Delete this estimate?')) return;
    deleteMutation.mutate();
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading estimate…</p>
        </div>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Estimate not found.</p>
        <button onClick={() => navigate('/estimates')} className="btn-outline mt-4">← Back to Estimates</button>
      </div>
    );
  }

  const est = data.data;
  const company = settingsData?.data;

  useEffect(() => {
    if (shouldPrint && est && company) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldPrint, est, company]);

  return (
    <div className="space-y-4 fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 no-print">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={() => navigate('/estimates')} className="btn-outline p-2 flex-shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800 font-['Outfit'] truncate flex items-center gap-2">
              <ClipboardList size={20} className="text-blue-600" />
              {est.estimate_number}
            </h1>
            <p className="text-gray-500 text-sm">Dated {formatDate(est.estimate_date)}</p>
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
          <span className={`text-xs px-3 py-1.5 rounded-full font-semibold flex items-center ${STATUS_COLORS[est.status]}`}>
            {est.status.charAt(0).toUpperCase() + est.status.slice(1)}
          </span>
          {est.status === 'draft' && (
            <button
              onClick={() => updateStatusMutation.mutate('sent')}
              disabled={updateStatusMutation.isPending}
              className="btn-outline flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm"
            >
              <Send size={12} /> Mark Sent
            </button>
          )}
          {est.status === 'sent' && (
            <>
              <button onClick={() => updateStatusMutation.mutate('accepted')} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600">
                <CheckCircle size={12} /> Accepted
              </button>
              <button onClick={() => updateStatusMutation.mutate('rejected')} className="btn-outline text-xs flex items-center gap-1.5 border-red-300 text-red-600 hover:bg-red-50">
                <XCircle size={12} /> Rejected
              </button>
            </>
          )}
          <button
            onClick={() => window.print()}
            className="btn-outline flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm"
          >
            <Printer size={13} /> Print
          </button>
          {/* <button
            id="download-pdf-btn"
            onClick={handleDownload}
            disabled={downloading}
            className="btn-outline flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm"
          >
            {downloading
              ? <span className="w-4 h-4 border-2 border-primary-light/30 border-t-primary-light rounded-full animate-spin" />
              : <Download size={13} />
            }
            Download PDF
          </button> */}
          <button onClick={handleDelete} className="btn-danger flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm">
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="card p-3 sm:p-6 overflow-x-auto">
        <div style={{ minWidth: '580px' }}>
          {company && <EstimatePrintView estimate={est} company={company} />}
        </div>
      </div>
    </div>
  );
}
