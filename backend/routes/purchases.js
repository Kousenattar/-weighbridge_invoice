const express = require('express');
const multer  = require('multer');
const Purchase = require('../models/Purchase');
const { protect } = require('../middleware/auth');
const { extractBillData } = require('../utils/billExtractor');

const router = express.Router();

// multer — store file in memory (no disk write needed, we pass buffer to Gemini)
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WEBP or PDF files are allowed'));
  },
});

// ─── Helper: recalculate GST from body ───────────────────────────────────────
function calcGST(items, gst_type, cgst_rate, sgst_rate, igst_rate) {
  const processedItems = items.map((item, idx) => ({
    sr_no:    idx + 1,
    item_name: item.item_name,
    hsn_code:  item.hsn_code || '',
    quantity:  Number(item.quantity),
    rate:      Number(item.rate),
    amount:    Number(item.quantity) * Number(item.rate),
  }));

  const subtotal = processedItems.reduce((sum, i) => sum + i.amount, 0);
  let cgst_amount = 0, sgst_amount = 0, igst_amount = 0, total_gst = 0;

  if (gst_type === 'CGST_SGST') {
    cgst_amount = (subtotal * cgst_rate) / 100;
    sgst_amount = (subtotal * sgst_rate) / 100;
    total_gst   = cgst_amount + sgst_amount;
  } else if (gst_type === 'IGST') {
    igst_amount = (subtotal * igst_rate) / 100;
    total_gst   = igst_amount;
  }

  return { processedItems, subtotal, cgst_amount, sgst_amount, igst_amount, total_gst, grand_total: subtotal + total_gst };
}

// ─── GET /api/purchases ───────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { supplier_name, bill_no, from_date, to_date, page = 1, limit = 20 } = req.query;
    const query = {};

    if (supplier_name) query.supplier_name = { $regex: supplier_name, $options: 'i' };
    if (bill_no)       query.bill_no       = { $regex: bill_no,       $options: 'i' };
    if (from_date || to_date) {
      query.purchase_date = {};
      if (from_date) query.purchase_date.$gte = new Date(from_date);
      if (to_date)   query.purchase_date.$lte = new Date(to_date + 'T23:59:59');
    }

    const total     = await Purchase.countDocuments(query);
    const purchases = await Purchase.find(query)
      .sort({ purchase_date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: purchases, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/purchases/dashboard ────────────────────────────────────────────
router.get('/dashboard', protect, async (req, res) => {
  try {
    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const totalPurchases = await Purchase.countDocuments();

    const monthlyResult = await Purchase.aggregate([
      { $match: { purchase_date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: '$grand_total' }, gst: { $sum: '$total_gst' } } },
    ]);

    const recentPurchases = await Purchase.find()
      .sort({ createdAt: -1 })
      .limit(5);

    // Last 6 months chart data
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d     = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const result = await Purchase.aggregate([
        { $match: { purchase_date: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$grand_total' }, gst: { $sum: '$total_gst' }, count: { $sum: 1 } } },
      ]);
      monthlyData.push({
        month: start.toLocaleString('default', { month: 'short', year: 'numeric' }),
        total: result[0]?.total || 0,
        gst:   result[0]?.gst   || 0,
        count: result[0]?.count || 0,
      });
    }

    res.json({
      success: true,
      data: {
        totalPurchases,
        monthlyTotal: monthlyResult[0]?.total || 0,
        monthlyGST:   monthlyResult[0]?.gst   || 0,
        recentPurchases,
        monthlyData,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/purchases/summary  (GST analysis) ───────────────────────────────
router.get('/summary', protect, async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const match = {};
    if (from_date || to_date) {
      match.purchase_date = {};
      if (from_date) match.purchase_date.$gte = new Date(from_date);
      if (to_date)   match.purchase_date.$lte = new Date(to_date + 'T23:59:59');
    }

    // Overall totals
    const overall = await Purchase.aggregate([
      { $match: match },
      { $group: {
        _id:         null,
        count:       { $sum: 1 },
        subtotal:    { $sum: '$subtotal' },
        cgst:        { $sum: '$cgst_amount' },
        sgst:        { $sum: '$sgst_amount' },
        igst:        { $sum: '$igst_amount' },
        total_gst:   { $sum: '$total_gst' },
        grand_total: { $sum: '$grand_total' },
      }},
    ]);

    // Monthly breakdown (last 12 months)
    const monthly = [];
    for (let i = 11; i >= 0; i--) {
      const d     = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      // Apply date-range filter intersect
      const monthMatch = { purchase_date: { $gte: start, $lte: end } };

      const result = await Purchase.aggregate([
        { $match: monthMatch },
        { $group: { _id: null, total_gst: { $sum: '$total_gst' }, grand_total: { $sum: '$grand_total' } } },
      ]);

      monthly.push({
        month:       start.toLocaleString('default', { month: 'short', year: 'numeric' }),
        total_gst:   result[0]?.total_gst   || 0,
        grand_total: result[0]?.grand_total || 0,
      });
    }

    res.json({ success: true, data: { overall: overall[0] || {}, monthly } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ─── GET /api/purchases/export  (all records for Excel download) ──────────────
router.get('/export', protect, async (req, res) => {
  try {
    const { supplier_name, bill_no, from_date, to_date } = req.query;
    const query = {};

    if (supplier_name) query.supplier_name = { $regex: supplier_name, $options: 'i' };
    if (bill_no)       query.bill_no       = { $regex: bill_no,       $options: 'i' };
    if (from_date || to_date) {
      query.purchase_date = {};
      if (from_date) query.purchase_date.$gte = new Date(from_date);
      if (to_date)   query.purchase_date.$lte = new Date(to_date + 'T23:59:59');
    }

    const purchases = await Purchase.find(query).sort({ purchase_date: -1 });
    res.json({ success: true, data: purchases, total: purchases.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/purchases/extract-bill ────────────────────────────────────────
router.post('/extract-bill', protect, upload.single('bill'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Send a file in the "bill" field.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, message: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const extracted = await extractBillData(req.file.buffer, req.file.mimetype);
    res.json({ success: true, data: extracted });
  } catch (err) {
    console.error('Bill extraction error:', err.message);
    // Give a user-friendly message for common Gemini errors
    const msg = err.message?.includes('JSON')
      ? 'AI could not parse the bill clearly. Please upload a clearer image.'
      : err.message?.includes('SAFETY')
      ? 'Image was blocked by AI safety filters. Try a different image.'
      : 'Bill extraction failed: ' + err.message;
    res.status(500).json({ success: false, message: msg });
  }
});

// ─── GET /api/purchases/:id ───────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    res.json({ success: true, data: purchase });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/purchases ──────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const {
      bill_no, purchase_date,
      supplier_name, supplier_address, supplier_gst, supplier_state, supplier_state_code,
      gst_type = 'NONE', items,
      cgst_rate = 9, sgst_rate = 9, igst_rate = 18,
      notes,
    } = req.body;

    if (!bill_no)        return res.status(400).json({ success: false, message: 'Bill number is required' });
    if (!supplier_name)  return res.status(400).json({ success: false, message: 'Supplier name is required' });
    if (!items?.length)  return res.status(400).json({ success: false, message: 'At least one item is required' });

    const { processedItems, subtotal, cgst_amount, sgst_amount, igst_amount, total_gst, grand_total } =
      calcGST(items, gst_type, Number(cgst_rate), Number(sgst_rate), Number(igst_rate));

    const purchase = await Purchase.create({
      bill_no, purchase_date: purchase_date || new Date(),
      supplier_name, supplier_address, supplier_gst, supplier_state, supplier_state_code,
      gst_type, items: processedItems,
      subtotal,
      cgst_rate: gst_type === 'CGST_SGST' ? Number(cgst_rate) : 0,
      sgst_rate: gst_type === 'CGST_SGST' ? Number(sgst_rate) : 0,
      igst_rate: gst_type === 'IGST'      ? Number(igst_rate) : 0,
      cgst_amount, sgst_amount, igst_amount, total_gst, grand_total,
      notes: notes || '',
    });

    res.status(201).json({ success: true, data: purchase });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/purchases/:id ───────────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const {
      bill_no, purchase_date,
      supplier_name, supplier_address, supplier_gst, supplier_state, supplier_state_code,
      gst_type = 'NONE', items,
      cgst_rate = 9, sgst_rate = 9, igst_rate = 18,
      notes,
    } = req.body;

    const { processedItems, subtotal, cgst_amount, sgst_amount, igst_amount, total_gst, grand_total } =
      calcGST(items, gst_type, Number(cgst_rate), Number(sgst_rate), Number(igst_rate));

    const purchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      {
        bill_no, purchase_date,
        supplier_name, supplier_address, supplier_gst, supplier_state, supplier_state_code,
        gst_type, items: processedItems,
        subtotal,
        cgst_rate: gst_type === 'CGST_SGST' ? Number(cgst_rate) : 0,
        sgst_rate: gst_type === 'CGST_SGST' ? Number(sgst_rate) : 0,
        igst_rate: gst_type === 'IGST'      ? Number(igst_rate) : 0,
        cgst_amount, sgst_amount, igst_amount, total_gst, grand_total,
        notes: notes || '',
      },
      { new: true, runValidators: true }
    );

    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    res.json({ success: true, data: purchase });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/purchases/:id ────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const purchase = await Purchase.findByIdAndDelete(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    res.json({ success: true, message: 'Purchase deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
