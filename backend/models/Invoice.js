const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  sr_no: { type: Number, required: true },
  item_name: { type: String, required: true, trim: true },
  hsn_code: { type: String, trim: true, default: '' },
  quantity: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
});

const invoiceSchema = new mongoose.Schema({
  invoice_number: { type: String, required: true, unique: true },
  invoice_type: { type: String, enum: ['GST', 'NON_GST'], required: true },
  gst_type: { type: String, enum: ['CGST_SGST', 'IGST', 'NONE'], default: 'NONE' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  invoice_date: { type: Date, required: true, default: Date.now },
  items: [invoiceItemSchema],
  subtotal: { type: Number, required: true, default: 0 },
  cgst_rate: { type: Number, default: 0 },
  sgst_rate: { type: Number, default: 0 },
  igst_rate: { type: Number, default: 0 },
  cgst_amount: { type: Number, default: 0 },
  sgst_amount: { type: Number, default: 0 },
  igst_amount: { type: Number, default: 0 },
  total_gst: { type: Number, default: 0 },
  grand_total: { type: Number, required: true },
  amount_in_words: { type: String },
  eway_bill: { type: String, default: '' },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'sent', 'paid', 'cancelled'], default: 'draft' },
  pdf_url: { type: String, default: '' },
  is_duplicate_of: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
}, { timestamps: true });

// Counter schema for auto-incrementing invoice numbers
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

module.exports = { Invoice: mongoose.model('Invoice', invoiceSchema), Counter };
