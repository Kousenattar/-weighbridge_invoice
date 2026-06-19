const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  sr_no:     { type: Number, required: true },
  item_name: { type: String, required: true, trim: true },
  hsn_code:  { type: String, trim: true, default: '' },
  quantity:  { type: Number, required: true, min: 0 },
  rate:      { type: Number, required: true, min: 0 },
  amount:    { type: Number, required: true, min: 0 },
});

const purchaseSchema = new mongoose.Schema({
  bill_no:             { type: String, required: true, trim: true },
  purchase_date:       { type: Date, required: true, default: Date.now },

  // Supplier info
  supplier_name:       { type: String, required: true, trim: true },
  supplier_address:    { type: String, default: '' },
  supplier_gst:        { type: String, default: '', trim: true, uppercase: true },
  supplier_state:      { type: String, default: '' },
  supplier_state_code: { type: String, default: '' },

  // GST configuration
  gst_type:   { type: String, enum: ['CGST_SGST', 'IGST', 'NONE'], default: 'NONE' },

  // Items
  items: [purchaseItemSchema],

  // Amounts
  subtotal:     { type: Number, required: true, default: 0 },
  cgst_rate:    { type: Number, default: 0 },
  sgst_rate:    { type: Number, default: 0 },
  igst_rate:    { type: Number, default: 0 },
  cgst_amount:  { type: Number, default: 0 },
  sgst_amount:  { type: Number, default: 0 },
  igst_amount:  { type: Number, default: 0 },
  total_gst:    { type: Number, default: 0 },
  grand_total:  { type: Number, required: true },

  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Purchase', purchaseSchema);
