const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date) => {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

function generateInvoiceHTML(invoice, company, client) {
  const isGST = invoice.invoice_type === 'GST';
  const isCGST = invoice.gst_type === 'CGST_SGST';
  const isIGST = invoice.gst_type === 'IGST';

  const itemRows = invoice.items.map((item, idx) => `
    <tr>
      <td class="center">${item.sr_no || idx + 1}</td>
      <td class="left item-name">${item.item_name}</td>
      <td class="center">${item.hsn_code || ''}</td>
      <td class="center">${item.quantity}</td>
      <td class="right">${formatCurrency(item.rate)}</td>
      <td class="right">${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');

  // Fill blank rows to maintain invoice height
  const minRows = 8;
  const blankRows = Math.max(0, minRows - invoice.items.length);
  const blankRowsHTML = Array(blankRows).fill('<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>').join('');

  let gstSection = '';
  if (isGST && isCGST) {
    gstSection = `
      <tr>
        <td colspan="2" class="left bold">Amount in</td>
        <td colspan="2" class="label">SGST @ ${invoice.sgst_rate || 9}.00%</td>
        <td colspan="2" class="right">${formatCurrency(invoice.sgst_amount)}</td>
      </tr>
      <tr>
        <td colspan="2"></td>
        <td colspan="2" class="label">CGST @ ${invoice.cgst_rate || 9}.00%</td>
        <td colspan="2" class="right">${formatCurrency(invoice.cgst_amount)}</td>
      </tr>
    `;
  } else if (isGST && isIGST) {
    gstSection = `
      <tr>
        <td colspan="2" class="left bold">Amount in</td>
        <td colspan="2" class="label igst-link">IGST@ ${invoice.igst_rate || 18}.00%</td>
        <td colspan="2" class="right">${formatCurrency(invoice.igst_amount)}</td>
      </tr>
    `;
  } else {
    gstSection = `
      <tr>
        <td colspan="2" class="left bold">Amount In Words:</td>
        <td colspan="2" class="label">SGST @ 0.00%</td>
        <td colspan="2" class="right">000.00</td>
      </tr>
      <tr>
        <td colspan="2"></td>
        <td colspan="2" class="label">CGST @ 0.00%</td>
        <td colspan="2" class="right">000.00</td>
      </tr>
    `;
  }

  const headerTitle = isGST ? 'TAX INVOICE' : '';
  const showGSTIN = isGST;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 8mm; border: 2px solid #1a3a6b; }
  
  .gstin-row { font-size: 10px; font-weight: bold; padding: 3px 0; }
  
  .invoice-title { text-align: center; font-size: 14px; font-weight: bold; padding: 4px 0; }
  
  .company-header { background: #1a3a6b; color: #fff; text-align: center; padding: 6px 0; }
  .company-header .company-name { font-size: 18px; font-weight: bold; letter-spacing: 1px; }
  .company-header .company-sub { font-size: 10px; margin-top: 2px; }
  
  .specialist-row { text-align: center; color: #c00; font-size: 10px; font-weight: bold; 
    border: 1px solid #1a3a6b; padding: 3px 0; border-left: none; border-right: none; }
  
  table { width: 100%; border-collapse: collapse; }
  
  .info-table td { padding: 3px 6px; vertical-align: top; font-size: 10.5px; }
  .info-table .label { font-weight: bold; }
  
  .items-header { background: #1a3a6b; color: #fff; }
  .items-header th { padding: 5px 4px; font-size: 10.5px; font-weight: bold; text-align: center; border: 1px solid #6b8cbf; }
  
  .items-body td { border: 1px solid #b0c4de; padding: 3px 4px; vertical-align: top; }
  .items-body tr:nth-child(even) { background: #f8f9ff; }
  
  .center { text-align: center; }
  .right { text-align: right; }
  .left { text-align: left; }
  .bold { font-weight: bold; }
  .item-name { font-size: 10px; }
  
  .total-qty-row td { border-top: 2px solid #1a3a6b; border-bottom: 2px solid #1a3a6b; 
    padding: 4px; font-weight: bold; background: #eef2ff; }
  
  .summary-table td { padding: 3px 6px; vertical-align: middle; }
  .summary-table .label { color: #1a3a6b; font-weight: bold; font-size: 10px; text-align: right; }
  .summary-table .igst-link { color: #00a; text-decoration: underline; font-weight: bold; }
  
  .grand-total-row td { border-top: 2px solid #1a3a6b; font-weight: bold; padding: 4px 6px; }
  .grand-total-label { font-size: 11px; font-weight: bold; color: #1a3a6b; text-align: right; }
  .grand-total-value { font-size: 13px; font-weight: bold; text-align: right; }
  
  .amount-words { font-size: 12px; font-weight: bold; padding: 4px 0; }
  
  .bank-details { font-size: 9.5px; padding: 4px 6px; border-top: 1px solid #1a3a6b; }
  
  .footer-table td { padding: 4px 6px; vertical-align: top; font-size: 9.5px; }
  .terms-col { width: 65%; border-right: 1px solid #1a3a6b; }
  .sign-col { width: 35%; text-align: center; }
  
  .sign-name { font-weight: bold; font-size: 11px; margin-top: 24px; }
  .sign-label { font-size: 9.5px; }
  
  .border-top { border-top: 1px solid #1a3a6b; }
  .border-all { border: 1px solid #1a3a6b; }
  .border-bottom { border-bottom: 1px solid #1a3a6b; }
  
  .info-box { border: 1px solid #1a3a6b; }
  .divider-v { border-right: 1px solid #1a3a6b; }
  
  .eway-row td { font-size: 10px; padding: 2px 6px; }
</style>
</head>
<body>
<div class="page">
  ${showGSTIN ? `<div class="gstin-row">GSTIN :${company.gst_number}</div>` : ''}
  
  ${headerTitle ? `<div class="invoice-title">${headerTitle}</div>` : ''}
  
  <div class="company-header">
    <div class="company-name">${company.company_name}</div>
    <div class="company-sub">${company.address}</div>
    <div class="company-sub">Email Id:- ${company.email} &nbsp; Mobile No. ${company.mobile}</div>
  </div>
  
  <div class="specialist-row">${company.specialist_text || 'SPECIALIST IN ALL TYPES OF WEIGHBRIGES & ELETRONIC WEIGHING SCALE'}</div>
  
  <!-- Client & Invoice Info -->
  <table class="info-table border-all" style="margin-top: 0;">
    <tr>
      <td style="width:60%; border-right: 1px solid #1a3a6b;">
        <table style="width:100%">
          <tr>
            <td class="label" style="width:90px">Party Name</td>
            <td>: ${client.client_name || client.trade_name || ''}</td>
          </tr>
          <tr>
            <td class="label" style="vertical-align:top">Address</td>
            <td>: ${client.address || ''}</td>
          </tr>
          ${isGST ? `
          <tr>
            <td class="label">Party GST NO</td>
            <td>: ${client.gst_number || ''}</td>
          </tr>
          ` : `
          <tr>
            <td class="label">State</td>
            <td>: ${client.state || ''}</td>
          </tr>
          `}
          <tr>
            <td class="label">State Code</td>
            <td>: ${client.state_code || ''}</td>
          </tr>
        </table>
      </td>
      <td style="width:40%; vertical-align:top;">
        <table style="width:100%">
          <tr>
            <td class="label">Invoice No.</td>
            <td>: ${invoice.invoice_number}</td>
          </tr>
          <tr>
            <td class="label">Date</td>
            <td>: ${formatDate(invoice.invoice_date)}</td>
          </tr>
          ${isIGST ? `
          <tr>
            <td class="label">E-Way Bill</td>
            <td>: ${invoice.eway_bill || ''}</td>
          </tr>
          ` : ''}
        </table>
      </td>
    </tr>
  </table>
  
  <!-- Items Table -->
  <table style="margin-top:0">
    <thead class="items-header">
      <tr>
        <th style="width:5%">S.NO.</th>
        <th style="width:35%; text-align:left">Item Name</th>
        <th style="width:12%">HS CODE</th>
        <th style="width:10%">Qty</th>
        <th style="width:15%">Rate</th>
        <th style="width:15%">Total Amount</th>
      </tr>
    </thead>
    <tbody class="items-body">
      ${itemRows}
      ${blankRowsHTML}
    </tbody>
  </table>
  
  <!-- Total Row -->
  <table>
    <tr class="total-qty-row">
      <td style="width:5%"></td>
      <td style="width:35%"></td>
      <td style="width:12%"></td>
      <td style="width:10%; text-align:center">Total Qty. ${invoice.items.reduce((s, i) => s + i.quantity, 0)}</td>
      <td style="width:15%; text-align:right">Amount</td>
      <td style="width:15%; text-align:right">${formatCurrency(invoice.subtotal)}</td>
    </tr>
  </table>
  
  <!-- Amount in Words + GST Summary -->
  <table class="summary-table border-top">
    <tr>
      <td style="width:50%; vertical-align:top; border-right:1px solid #1a3a6b; padding: 4px 6px;">
        ${isGST ? `
          <div class="amount-words bold" style="font-size:13px">Amount in</div>
          <div class="amount-words bold" style="font-size:13px">Words -&nbsp; ${invoice.amount_in_words || ''}</div>
        ` : `
          <div class="amount-words bold" style="font-size:12px">Amount In Words: ${invoice.amount_in_words || ''}</div>
        `}
      </td>
      <td style="width:50%; vertical-align:top;">
        <table style="width:100%">
          ${isGST && isCGST ? `
            <tr>
              <td class="label right" style="width:60%">SGST @ ${invoice.sgst_rate || 9}.00%</td>
              <td class="right" style="width:40%">${formatCurrency(invoice.sgst_amount)}</td>
            </tr>
            <tr>
              <td class="label right">CGST @ ${invoice.cgst_rate || 9}.00%</td>
              <td class="right">${formatCurrency(invoice.cgst_amount)}</td>
            </tr>
          ` : isGST && isIGST ? `
            <tr>
              <td class="igst-link right" style="width:60%">IGST@ ${invoice.igst_rate || 18}.00%</td>
              <td class="right" style="width:40%">${formatCurrency(invoice.igst_amount)}</td>
            </tr>
          ` : `
            <tr>
              <td class="label right" style="width:60%">SGST @ 0.00%</td>
              <td class="right" style="width:40%">000.00</td>
            </tr>
            <tr>
              <td class="label right">CGST @ 0.00%</td>
              <td class="right">000.00</td>
            </tr>
          `}
          <tr style="border-top: 2px solid #1a3a6b;">
            <td class="grand-total-label">Total<br>Amount</td>
            <td class="grand-total-value">₹ ${formatCurrency(invoice.grand_total)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  
  <!-- Bank Details -->
  ${isGST ? `
  <div class="bank-details border-top">
    Bank Details :- ${company.bank_name} , Name-${company.account_holder} , A/C No - ${company.account_number}, IFSC – ${company.ifsc}
  </div>
  ` : `
  <div class="bank-details border-top">
    Bank Details :- ${company.bank_name} , Name-${company.account_holder} , A/C No - ${company.account_number}, IFSC- ${company.ifsc}
  </div>
  `}
  
  <!-- Terms & Conditions + Signature -->
  <table class="footer-table border-top" style="margin-top: 4px;">
    <tr>
      <td class="terms-col">
        <div class="bold" style="font-size:10px; margin-bottom:3px;">Terms & Conditions</div>
        ${(company.terms || []).map((t, i) => `<div>${i + 1}. ${t}</div>`).join('')}
      </td>
      <td class="sign-col">
        <div class="bold">FOR ${company.company_name}</div>
        <div style="margin-top: 30px; border-top: 1px solid #000; padding-top: 4px;">
          <div class="sign-name">${company.signatory_name || ''}</div>
          <div class="sign-label">Authorized Signatory</div>
        </div>
      </td>
    </tr>
  </table>
</div>
</body>
</html>`;
}

async function generatePDF(invoice, company, client) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    const html = generateInvoiceHTML(invoice, company, client);
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

module.exports = { generatePDF, generateInvoiceHTML };
