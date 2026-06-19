const puppeteer = require('puppeteer');

const fmtCur = (n) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const fmtDate = (date) => {
  const d = new Date(date);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
};

function generateQuotationHTML(estimate, company) {
  const isCGST = estimate.gst_type === 'CGST_SGST';
  const isIGST = estimate.gst_type === 'IGST';
  const isGST  = isCGST || isIGST;

  const itemRows = estimate.items.map((item, idx) => {
    const taxVal = item.taxable_value || 0;
    const cgstAmt = item.cgst_amount || 0;
    const sgstAmt = item.sgst_amount || 0;
    const igstAmt = item.igst_amount || 0;

    if (isCGST) {
      return `
        <tr>
          <td class="center">${item.sr_no || idx + 1}</td>
          <td class="left item-name">${(item.item_name || '').replace(/\n/g, '<br>')}</td>
          <td class="center">${item.hsn_code || ''}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">${fmtCur(item.rate)}</td>
          <td class="right">${fmtCur(taxVal)}</td>
          <td class="center">${item.cgst_rate || 0}%<br><span class="small-amt">${fmtCur(cgstAmt)}</span></td>
          <td class="center">${item.sgst_rate || 0}%<br><span class="small-amt">${fmtCur(sgstAmt)}</span></td>
          <td class="right bold">${fmtCur(item.total)}</td>
        </tr>`;
    } else if (isIGST) {
      return `
        <tr>
          <td class="center">${item.sr_no || idx + 1}</td>
          <td class="left item-name">${(item.item_name || '').replace(/\n/g, '<br>')}</td>
          <td class="center">${item.hsn_code || ''}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">${fmtCur(item.rate)}</td>
          <td class="right">${fmtCur(taxVal)}</td>
          <td class="center" colspan="2">${item.igst_rate || 0}%<br><span class="small-amt">${fmtCur(igstAmt)}</span></td>
          <td class="right bold">${fmtCur(item.total)}</td>
        </tr>`;
    } else {
      return `
        <tr>
          <td class="center">${item.sr_no || idx + 1}</td>
          <td class="left item-name">${(item.item_name || '').replace(/\n/g, '<br>')}</td>
          <td class="center">${item.hsn_code || ''}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">${fmtCur(item.rate)}</td>
          <td class="right">${fmtCur(taxVal)}</td>
          <td class="center">—</td>
          <td class="center">—</td>
          <td class="right bold">${fmtCur(item.total)}</td>
        </tr>`;
    }
  }).join('');

  const minRows = 5;
  const blankCount = Math.max(0, minRows - estimate.items.length);
  const blankRows = Array(blankCount).fill(
    `<tr style="height:28px"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`
  ).join('');

  const gstHeaderCols = isCGST
    ? `<th>CGST</th><th>SGST</th>`
    : isIGST
    ? `<th colspan="2">IGST</th>`
    : `<th>CGST</th><th>SGST</th>`;

  const termsHTML = (company.terms || []).map((t, i) => `<p>${i + 1}. ${t}</p>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 10.5px; color: #000; background:#fff; }
  .page { width:210mm; min-height:297mm; padding:6mm 8mm; }

  /* Header */
  .co-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px; }
  .co-name { font-size:22px; font-weight:bold; color:#1a3a6b; }
  .co-addr { font-size:9.5px; margin-top:3px; line-height:1.5; color:#333; }
  .co-contact { text-align:right; font-size:9.5px; line-height:1.7; }
  .co-contact strong { font-size:10px; }

  /* GSTIN + Quotation title row */
  .title-row { display:flex; justify-content:space-between; align-items:center;
    border:2px solid #1a3a6b; padding:5px 8px; margin-bottom:0; }
  .gstin-text { font-size:11px; font-weight:bold; }
  .quotation-title { font-size:18px; font-weight:bold; color:#e60000; letter-spacing:1px; }

  /* Info box */
  .info-box { border:1px solid #1a3a6b; border-top:none; display:flex; }
  .client-panel { flex:1; padding:6px 8px; border-right:1px solid #1a3a6b; }
  .client-panel .row { display:flex; margin-bottom:2px; font-size:10px; }
  .client-panel .lbl { font-weight:bold; width:100px; flex-shrink:0; }
  .quote-meta { width:45%; padding:6px 8px; }
  .quote-meta .row { display:flex; justify-content:space-between; margin-bottom:3px; font-size:10px; }
  .quote-meta .mlbl { font-weight:bold; }

  /* Items table */
  table.items { width:100%; border-collapse:collapse; margin-top:0; }
  table.items thead tr { background:#1a3a6b; color:#fff; }
  table.items th { padding:5px 3px; font-size:9.5px; font-weight:bold; text-align:center;
    border:1px solid #6b8cbf; }
  table.items th.left { text-align:left; padding-left:5px; }
  table.items tbody td { border:1px solid #b0c4de; padding:3px 3px; vertical-align:top; font-size:9.5px; }
  table.items tbody tr:nth-child(even) { background:#f5f8ff; }
  .center { text-align:center; }
  .right { text-align:right; }
  .left { text-align:left; padding-left:5px !important; }
  .bold { font-weight:bold; }
  .item-name { font-size:9.5px; line-height:1.5; }
  .small-amt { font-size:8.5px; display:block; }

  /* Sub-total row */
  .subtotal-row td { border-top:2px solid #1a3a6b; border-bottom:2px solid #1a3a6b;
    background:#eef2ff; font-weight:bold; padding:4px 3px; font-size:10px; }

  /* Footer section */
  .footer-section { display:flex; border:1px solid #1a3a6b; border-top:2px solid #1a3a6b; margin-top:-1px; }
  .footer-left { flex:1; border-right:1px solid #1a3a6b; }
  .footer-right { width:42%; }

  .words-box { padding:5px 8px; border-bottom:1px solid #1a3a6b; font-size:10px; font-weight:bold; }
  .bank-box { padding:5px 8px; }
  .bank-title { font-weight:bold; font-size:10px; border-bottom:1px solid #b0c4de; margin-bottom:3px; padding-bottom:2px; }
  .bank-row { display:flex; margin-bottom:2px; font-size:9.5px; }
  .bank-lbl { font-weight:bold; width:80px; flex-shrink:0; }

  .terms-box { padding:5px 8px; border-top:1px solid #1a3a6b; font-size:9px; line-height:1.5; }
  .terms-title { font-weight:bold; font-size:9.5px; margin-bottom:3px; }

  /* Fixed Terms & Conditions */
  .tnc-section { border:1px solid #1a3a6b; border-top:2px solid #1a3a6b; margin-top:6px; padding:6px 8px; }
  .tnc-title { font-weight:bold; font-size:10.5px; color:#1a3a6b; margin-bottom:5px;
    border-bottom:1px solid #b0c4de; padding-bottom:3px; letter-spacing:0.5px; }
  .tnc-list { list-style:none; padding:0; margin:0; }
  .tnc-list li { font-size:9px; line-height:1.6; margin-bottom:2px; display:flex; gap:5px; }
  .tnc-list li .tnc-num { font-weight:bold; color:#1a3a6b; flex-shrink:0; min-width:14px; }
  .tnc-list li .tnc-lbl { font-weight:bold; flex-shrink:0; }
  .tnc-list li .tnc-val { flex:1; }

  .summary-table { width:100%; border-collapse:collapse; }
  .summary-table td { padding:3px 8px; font-size:9.5px; border-bottom:1px solid #e0e8f0; }
  .summary-table .slbl { font-weight:bold; color:#1a3a6b; text-align:right; }
  .summary-table .sval { text-align:right; font-weight:600; }
  .summary-table .grand-row td { border-top:2px solid #1a3a6b; font-weight:bold; font-size:11px; padding:5px 8px; }

  .sign-box { padding:8px; text-align:center; border-top:1px solid #1a3a6b; font-size:9.5px; }
  .sign-box .for { font-weight:bold; }
  .sign-line { margin-top:30px; border-top:1px solid #000; padding-top:3px; font-weight:bold; font-size:10px; }
  .auth-label { font-size:9px; color:#555; }
</style>
</head>
<body>
<div class="page">

  <!-- Company Header -->
  <div class="co-header">
    <div>
      <div class="co-name">${company.company_name || ''}</div>
      <div class="co-addr">${(company.address || '').replace(/,/g, ',<br>')}</div>
    </div>
    <div class="co-contact">
      <strong>Name :</strong> ${company.signatory_name || ''}<br>
      <strong>Phone :</strong> ${company.mobile || ''}<br>
      <strong>Email:</strong> ${company.email || ''}
    </div>
  </div>

  <!-- GSTIN + Title -->
  <div class="title-row">
    <div class="gstin-text">GSTIN : ${company.gst_number || ''}</div>
    <div class="quotation-title">Quotation</div>
  </div>

  <!-- Client + Quote Meta -->
  <div class="info-box">
    <div class="client-panel">
      <div style="font-weight:bold;font-size:10px;margin-bottom:4px;border-bottom:1px solid #cce;padding-bottom:3px;">Customer Detail</div>
      <div class="row"><span class="lbl">M/S</span><span>${estimate.client_name || ''}</span></div>
      <div class="row"><span class="lbl">Address</span><span>${estimate.client_address || ''}</span></div>
      <div class="row"><span class="lbl">PHONE</span><span>${estimate.client_phone || ''}</span></div>
      <div class="row"><span class="lbl">GSTIN</span><span>${estimate.client_gst || ''}</span></div>
      <div class="row"><span class="lbl">Place of Supply</span><span>${estimate.place_of_supply || ''}</span></div>
    </div>
    <div class="quote-meta">
      <div class="row"><span class="mlbl">Quotation No.</span><span>${estimate.estimate_number}</span></div>
      <div class="row"><span class="mlbl">Quotation Date</span><span>${fmtDate(estimate.estimate_date)}</span></div>
      ${estimate.valid_until ? `<div class="row"><span class="mlbl">Valid Until</span><span>${fmtDate(estimate.valid_until)}</span></div>` : ''}
    </div>
  </div>

  <!-- Items Table -->
  <table class="items">
    <thead>
      <tr>
        <th style="width:4%">Sr.<br>No.</th>
        <th class="left" style="width:32%">Name of Product / Service</th>
        <th style="width:8%">HSN /<br>SAC</th>
        <th style="width:6%">Qty</th>
        <th style="width:10%">Rate</th>
        <th style="width:11%">Taxable<br>Value</th>
        ${gstHeaderCols}
        <th style="width:10%">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${blankRows}
    </tbody>
    <tr class="subtotal-row">
      <td></td>
      <td></td>
      <td></td>
      <td class="center">Total</td>
      <td></td>
      <td class="right">${fmtCur(estimate.subtotal)}</td>
      <td class="right">${isGST ? fmtCur(estimate.cgst_amount || estimate.igst_amount) : '—'}</td>
      <td class="right">${isCGST ? fmtCur(estimate.sgst_amount) : '—'}</td>
      <td class="right">${fmtCur(estimate.grand_total)}</td>
    </tr>
  </table>

  <!-- Footer -->
  <div class="footer-section">
    <div class="footer-left">
      <div class="words-box">
        <div style="font-size:9px;color:#555;margin-bottom:2px;">Total in words</div>
        <div>${estimate.amount_in_words || ''}</div>
      </div>
      <div class="bank-box">
        <div class="bank-title">Bank Details</div>
        <div class="bank-row"><span class="bank-lbl">Name</span><span>${company.bank_name || ''}</span></div>
        <div class="bank-row"><span class="bank-lbl">Branch</span><span>${company.branch || 'Main Branch'}</span></div>
        <div class="bank-row"><span class="bank-lbl">Acc. Number</span><span>${company.account_number || ''}</span></div>
        <div class="bank-row"><span class="bank-lbl">IFSC</span><span>${company.ifsc || ''}</span></div>
      </div>
      ${estimate.notes ? `<div class="terms-box" style="border-top:1px solid #1a3a6b;"><div class="terms-title">Notes / Terms</div><p style="font-size:9px;">${estimate.notes.replace(/\n/g,'<br>')}</p></div>` : ''}
    </div>

    <div class="footer-right">
      <table class="summary-table">
        <tr>
          <td class="slbl">Taxable Amount</td>
          <td class="sval">${fmtCur(estimate.subtotal)}</td>
        </tr>
        ${isCGST ? `
        <tr><td class="slbl">Add : CGST</td><td class="sval">${fmtCur(estimate.cgst_amount)}</td></tr>
        <tr><td class="slbl">Add : SGST</td><td class="sval">${fmtCur(estimate.sgst_amount)}</td></tr>
        ` : isIGST ? `
        <tr><td class="slbl">Add : IGST</td><td class="sval">${fmtCur(estimate.igst_amount)}</td></tr>
        ` : ''}
        <tr><td class="slbl">Total Tax</td><td class="sval">${fmtCur(estimate.total_tax)}</td></tr>
        <tr><td class="slbl">Round off Amount</td><td class="sval">${fmtCur(estimate.round_off || 0)}</td></tr>
        <tr class="grand-row">
          <td class="slbl" style="color:#1a3a6b;">Total Amount After Tax</td>
          <td class="sval" style="color:#1a3a6b;">₹${fmtCur(estimate.grand_total)}</td>
        </tr>
        <tr><td colspan="2" style="text-align:center;font-size:8.5px;color:#555;">(E &amp; O.E.)</td></tr>
      </table>

      <div class="sign-box">
        <div class="for">Certified that the particulars given above<br>For ${company.company_name || ''}</div>
        <div class="sign-line">Authorised Signatory</div>
      </div>
    </div>
  </div>

  <!-- Terms & Conditions -->
  <div class="tnc-section">
    <div class="tnc-title">Terms &amp; Conditions</div>
    <ul class="tnc-list">
      <li><span class="tnc-num">1.</span><span class="tnc-val">Subject to our Sangli Jurisdiction.</span></li>
      <li><span class="tnc-num">2.</span><span class="tnc-val">One year warranty against Manufacturing defects only.</span></li>
      <li><span class="tnc-num">3.</span><span class="tnc-lbl">Delivery :</span><span class="tnc-val">2 to 3 weeks from Date of Receipt of Purchase Order &amp; Advance.</span></li>
      <li><span class="tnc-num">4.</span><span class="tnc-lbl">Customer's Scope :</span><span class="tnc-val">Crane at time of installation, Weights arrangement if required at time of Stamping, Civil Construction as per Our Drawing, Local Welder, Labour at time of installation, 1 Phase Supply with Earthing, Battery Inverter, Table.</span></li>
      <li><span class="tnc-num">5.</span><span class="tnc-lbl">Payment :</span><span class="tnc-val">70% Advance, 20% Against Proforma, 10% Against installation and testing and before Passing.</span></li>
    </ul>
  </div>

</div>
</body>
</html>`;
}

async function generateQuotationPDF(estimate, company) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    const html = generateQuotationHTML(estimate, company);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '5mm', bottom: '5mm', left: '5mm', right: '5mm' },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

module.exports = { generateQuotationPDF, generateQuotationHTML };
