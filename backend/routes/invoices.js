const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { Invoice, Counter } = require('../models/Invoice');
const Client = require('../models/Client');
const CompanySettings = require('../models/CompanySettings');
const { protect } = require('../middleware/auth');
const { generateInvoiceNumber } = require('../utils/invoiceNumber');
const { numberToWords } = require('../utils/numberToWords');
const { generatePDF } = require('../utils/pdfGenerator');

const router = express.Router();

// Ensure PDF storage dir
const pdfDir = path.join(__dirname, '..', 'pdfs');
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

// @GET /api/invoices
router.get('/', protect, async (req, res) => {
  try {
    const { 
      invoice_type, gst_type, status, client_name, gst_number, 
      invoice_number, from_date, to_date, page = 1, limit = 20 
    } = req.query;
    
    const query = {};
    if (invoice_type) query.invoice_type = invoice_type;
    if (gst_type) query.gst_type = gst_type;
    if (status) query.status = status;
    if (invoice_number) query.invoice_number = { $regex: invoice_number, $options: 'i' };
    if (from_date || to_date) {
      query.invoice_date = {};
      if (from_date) query.invoice_date.$gte = new Date(from_date);
      if (to_date) query.invoice_date.$lte = new Date(to_date + 'T23:59:59');
    }
    
    let invoiceQuery = Invoice.find(query).populate('client');
    
    // Filter by client name or GST
    if (client_name || gst_number) {
      const clientQuery = {};
      if (client_name) clientQuery.client_name = { $regex: client_name, $options: 'i' };
      if (gst_number) clientQuery.gst_number = { $regex: gst_number, $options: 'i' };
      const clients = await Client.find(clientQuery).select('_id');
      query.client = { $in: clients.map(c => c._id) };
    }
    
    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate('client')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    
    res.json({ 
      success: true, data: invoices, total,
      page: Number(page), pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/invoices/dashboard
router.get('/dashboard', protect, async (req, res) => {
  try {
    const totalInvoices = await Invoice.countDocuments();
    const gstInvoices = await Invoice.countDocuments({ invoice_type: 'GST' });
    const nonGstInvoices = await Invoice.countDocuments({ invoice_type: 'NON_GST' });
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const monthlySalesResult = await Invoice.aggregate([
      { $match: { invoice_date: { $gte: startOfMonth, $lte: endOfMonth }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$grand_total' } } }
    ]);
    const monthlySales = monthlySalesResult[0]?.total || 0;
    
    const recentInvoices = await Invoice.find()
      .populate('client', 'client_name gst_number state')
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Monthly chart data (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const result = await Invoice.aggregate([
        { $match: { invoice_date: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$grand_total' }, count: { $sum: 1 } } }
      ]);
      monthlyData.push({
        month: start.toLocaleString('default', { month: 'short', year: 'numeric' }),
        total: result[0]?.total || 0,
        count: result[0]?.count || 0,
      });
    }
    
    res.json({ 
      success: true, 
      data: { totalInvoices, gstInvoices, nonGstInvoices, monthlySales, recentInvoices, monthlyData }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/invoices/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('client');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/invoices
router.post('/', protect, async (req, res) => {
  try {
    const {
      client_id, invoice_type, gst_type, items, invoice_date,
      cgst_rate = 9, sgst_rate = 9, igst_rate = 18, eway_bill, notes
    } = req.body;

    const company = await CompanySettings.findOne();
    const client = await Client.findById(client_id);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    // Calculate item totals
    const processedItems = items.map((item, idx) => ({
      sr_no: idx + 1,
      item_name: item.item_name,
      hsn_code: item.hsn_code || '',
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      amount: Number(item.quantity) * Number(item.rate),
    }));

    const subtotal = processedItems.reduce((sum, item) => sum + item.amount, 0);

    let cgst_amount = 0, sgst_amount = 0, igst_amount = 0, total_gst = 0;

    if (invoice_type === 'GST') {
      if (gst_type === 'CGST_SGST') {
        cgst_amount = (subtotal * cgst_rate) / 100;
        sgst_amount = (subtotal * sgst_rate) / 100;
        total_gst = cgst_amount + sgst_amount;
      } else if (gst_type === 'IGST') {
        igst_amount = (subtotal * igst_rate) / 100;
        total_gst = igst_amount;
      }
    }

    const grand_total = subtotal + total_gst;
    const amount_in_words = numberToWords(grand_total);

    // Generate sequential invoice number (atomic counter, no session needed)
    const prefix = company?.invoice_prefix || 'CSR';
    const invoice_number = await generateInvoiceNumber(prefix);

    const invoice = await Invoice.create({
      invoice_number,
      invoice_type,
      gst_type: invoice_type === 'GST' ? gst_type : 'NONE',
      client: client._id,
      invoice_date: invoice_date || new Date(),
      items: processedItems,
      subtotal,
      cgst_rate: invoice_type === 'GST' && gst_type === 'CGST_SGST' ? Number(cgst_rate) : 0,
      sgst_rate: invoice_type === 'GST' && gst_type === 'CGST_SGST' ? Number(sgst_rate) : 0,
      igst_rate: invoice_type === 'GST' && gst_type === 'IGST'      ? Number(igst_rate) : 0,
      cgst_amount,
      sgst_amount,
      igst_amount,
      total_gst,
      grand_total,
      amount_in_words,
      eway_bill: eway_bill || '',
      notes: notes || '',
    });

    const populated = await Invoice.findById(invoice._id).populate('client');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @PUT /api/invoices/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const { items, cgst_rate = 9, sgst_rate = 9, igst_rate = 18, invoice_type, gst_type, ...rest } = req.body;
    
    const processedItems = items.map((item, idx) => ({
      sr_no: idx + 1,
      item_name: item.item_name,
      hsn_code: item.hsn_code || '',
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      amount: Number(item.quantity) * Number(item.rate),
    }));
    
    const subtotal = processedItems.reduce((sum, item) => sum + item.amount, 0);
    let cgst_amount = 0, sgst_amount = 0, igst_amount = 0, total_gst = 0;
    
    if (invoice_type === 'GST') {
      if (gst_type === 'CGST_SGST') {
        cgst_amount = (subtotal * cgst_rate) / 100;
        sgst_amount = (subtotal * sgst_rate) / 100;
        total_gst = cgst_amount + sgst_amount;
      } else if (gst_type === 'IGST') {
        igst_amount = (subtotal * igst_rate) / 100;
        total_gst = igst_amount;
      }
    }
    
    const grand_total = subtotal + total_gst;
    const amount_in_words = numberToWords(grand_total);
    
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { ...rest, invoice_type, gst_type, items: processedItems, subtotal, cgst_amount, sgst_amount, igst_amount, total_gst, grand_total, amount_in_words, cgst_rate, sgst_rate, igst_rate },
      { new: true, runValidators: true }
    ).populate('client');
    
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @DELETE /api/invoices/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/invoices/:id/duplicate
router.post('/:id/duplicate', protect, async (req, res) => {
  try {
    const original = await Invoice.findById(req.params.id);
    if (!original) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const company = await CompanySettings.findOne();
    const prefix = company?.invoice_prefix || 'CSR';
    const invoice_number = await generateInvoiceNumber(prefix);

    const originalObj = original.toObject();
    delete originalObj._id;      // let Mongoose generate a new _id
    delete originalObj.createdAt;
    delete originalObj.updatedAt;
    delete originalObj.__v;

    const duplicate = await Invoice.create({
      ...originalObj,
      invoice_number,
      is_duplicate_of: original._id,
      invoice_date: new Date(),
      status: 'draft',
    });

    const populated = await Invoice.findById(duplicate._id).populate('client');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/invoices/:id/pdf
router.get('/:id/pdf', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('client');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    
    const company = await CompanySettings.findOne() || {};
    const pdfBuffer = await generatePDF(invoice.toObject(), company.toObject ? company.toObject() : company, invoice.client.toObject ? invoice.client.toObject() : invoice.client);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/invoices/reports/summary
router.get('/reports/summary', protect, async (req, res) => {
  try {
    const { from_date, to_date, type } = req.query;
    const match = {};
    if (from_date || to_date) {
      match.invoice_date = {};
      if (from_date) match.invoice_date.$gte = new Date(from_date);
      if (to_date) match.invoice_date.$lte = new Date(to_date + 'T23:59:59');
    }
    if (type === 'GST') match.invoice_type = 'GST';
    if (type === 'NON_GST') match.invoice_type = 'NON_GST';
    match.status = { $ne: 'cancelled' };
    
    const summary = await Invoice.aggregate([
      { $match: match },
      { $group: {
        _id: '$invoice_type',
        count: { $sum: 1 },
        subtotal: { $sum: '$subtotal' },
        cgst: { $sum: '$cgst_amount' },
        sgst: { $sum: '$sgst_amount' },
        igst: { $sum: '$igst_amount' },
        total: { $sum: '$grand_total' },
      }}
    ]);
    
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
