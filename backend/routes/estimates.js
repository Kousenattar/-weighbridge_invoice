const express = require('express');
const { Estimate, EstimateCounter } = require('../models/Estimate');
const CompanySettings = require('../models/CompanySettings');
const { protect } = require('../middleware/auth');
const { numberToWords } = require('../utils/numberToWords');
const { generateQuotationPDF } = require('../utils/quotationPdfGenerator');

const router = express.Router();

// Helper: generate sequential estimate number
async function generateEstimateNumber(prefix = 'CSR') {
  const counter = await EstimateCounter.findByIdAndUpdate(
    'estimate_seq',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-Q-${String(counter.seq).padStart(3, '0')}`;
}

// Helper: compute all totals from items + GST type/rates
function computeTotals(items, gst_type, cgst_rate, sgst_rate, igst_rate) {
  const isCGST = gst_type === 'CGST_SGST';
  const isIGST = gst_type === 'IGST';

  let subtotal = 0, cgst_amount = 0, sgst_amount = 0, igst_amount = 0;

  const processedItems = items.map((item, idx) => {
    const taxable_value = Number(item.quantity) * Number(item.rate);
    subtotal += taxable_value;

    let itemCgst = 0, itemSgst = 0, itemIgst = 0;
    if (isCGST) {
      itemCgst = (taxable_value * Number(cgst_rate)) / 100;
      itemSgst = (taxable_value * Number(sgst_rate)) / 100;
      cgst_amount += itemCgst;
      sgst_amount += itemSgst;
    } else if (isIGST) {
      itemIgst = (taxable_value * Number(igst_rate)) / 100;
      igst_amount += itemIgst;
    }

    const total = taxable_value + itemCgst + itemSgst + itemIgst;

    return {
      sr_no:         idx + 1,
      item_name:     item.item_name,
      hsn_code:      item.hsn_code || '',
      quantity:      Number(item.quantity),
      rate:          Number(item.rate),
      taxable_value,
      cgst_rate:     isCGST ? Number(cgst_rate) : 0,
      cgst_amount:   itemCgst,
      sgst_rate:     isCGST ? Number(sgst_rate) : 0,
      sgst_amount:   itemSgst,
      igst_rate:     isIGST ? Number(igst_rate) : 0,
      igst_amount:   itemIgst,
      total,
    };
  });

  const total_tax   = cgst_amount + sgst_amount + igst_amount;
  const grand_total = subtotal + total_tax;
  const round_off   = Math.round(grand_total) - grand_total;

  return {
    processedItems,
    subtotal,
    cgst_amount,
    sgst_amount,
    igst_amount,
    total_tax,
    round_off,
    grand_total: Math.round(grand_total),
    amount_in_words: numberToWords(Math.round(grand_total)),
  };
}

// ── GET /api/estimates ─────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const {
      search, status, from_date, to_date,
      page = 1, limit = 20
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { estimate_number: { $regex: search, $options: 'i' } },
        { client_name:     { $regex: search, $options: 'i' } },
      ];
    }
    if (from_date || to_date) {
      query.estimate_date = {};
      if (from_date) query.estimate_date.$gte = new Date(from_date);
      if (to_date)   query.estimate_date.$lte = new Date(to_date + 'T23:59:59');
    }

    const total     = await Estimate.countDocuments(query);
    const estimates = await Estimate.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: estimates, total,
      page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/estimates/:id ─────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const estimate = await Estimate.findById(req.params.id);
    if (!estimate) return res.status(404).json({ success: false, message: 'Estimate not found' });
    res.json({ success: true, data: estimate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/estimates ────────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const {
      estimate_date, valid_until, status = 'draft',
      client_name, client_address, client_phone, client_gst, place_of_supply,
      gst_type = 'CGST_SGST', cgst_rate = 9, sgst_rate = 9, igst_rate = 18,
      items, notes,
    } = req.body;

    const company = await CompanySettings.findOne();
    const prefix  = company?.invoice_prefix || 'CSR';
    const estimate_number = await generateEstimateNumber(prefix);

    const totals = computeTotals(items, gst_type, cgst_rate, sgst_rate, igst_rate);

    const estimate = await Estimate.create({
      estimate_number,
      estimate_date:  estimate_date || new Date(),
      valid_until:    valid_until   || null,
      status,
      client_name, client_address, client_phone, client_gst, place_of_supply,
      gst_type,
      cgst_rate: gst_type === 'CGST_SGST' ? Number(cgst_rate) : 0,
      sgst_rate: gst_type === 'CGST_SGST' ? Number(sgst_rate) : 0,
      igst_rate: gst_type === 'IGST'      ? Number(igst_rate) : 0,
      items:          totals.processedItems,
      subtotal:       totals.subtotal,
      cgst_amount:    totals.cgst_amount,
      sgst_amount:    totals.sgst_amount,
      igst_amount:    totals.igst_amount,
      total_tax:      totals.total_tax,
      round_off:      totals.round_off,
      grand_total:    totals.grand_total,
      amount_in_words: totals.amount_in_words,
      notes: notes || '',
    });

    res.status(201).json({ success: true, data: estimate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/estimates/:id ─────────────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const {
      estimate_date, valid_until, status,
      client_name, client_address, client_phone, client_gst, place_of_supply,
      gst_type = 'CGST_SGST', cgst_rate = 9, sgst_rate = 9, igst_rate = 18,
      items, notes,
    } = req.body;

    const totals = computeTotals(items, gst_type, cgst_rate, sgst_rate, igst_rate);

    const estimate = await Estimate.findByIdAndUpdate(
      req.params.id,
      {
        estimate_date, valid_until, status,
        client_name, client_address, client_phone, client_gst, place_of_supply,
        gst_type,
        cgst_rate: gst_type === 'CGST_SGST' ? Number(cgst_rate) : 0,
        sgst_rate: gst_type === 'CGST_SGST' ? Number(sgst_rate) : 0,
        igst_rate: gst_type === 'IGST'      ? Number(igst_rate) : 0,
        items:       totals.processedItems,
        subtotal:    totals.subtotal,
        cgst_amount: totals.cgst_amount,
        sgst_amount: totals.sgst_amount,
        igst_amount: totals.igst_amount,
        total_tax:   totals.total_tax,
        round_off:   totals.round_off,
        grand_total: totals.grand_total,
        amount_in_words: totals.amount_in_words,
        notes: notes || '',
      },
      { new: true, runValidators: true }
    );

    if (!estimate) return res.status(404).json({ success: false, message: 'Estimate not found' });
    res.json({ success: true, data: estimate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/estimates/:id ──────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const estimate = await Estimate.findByIdAndDelete(req.params.id);
    if (!estimate) return res.status(404).json({ success: false, message: 'Estimate not found' });
    res.json({ success: true, message: 'Estimate deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/estimates/:id/pdf ─────────────────────────────────────────────────
router.get('/:id/pdf', protect, async (req, res) => {
  try {
    const estimate = await Estimate.findById(req.params.id);
    if (!estimate) return res.status(404).json({ success: false, message: 'Estimate not found' });

    const company    = await CompanySettings.findOne() || {};
    const pdfBuffer  = await generateQuotationPDF(
      estimate.toObject(),
      company.toObject ? company.toObject() : company
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${estimate.estimate_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Quotation PDF error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
