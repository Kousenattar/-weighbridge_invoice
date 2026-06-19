const mongoose = require('mongoose');

const estimateItemSchema = new mongoose.Schema({
  sr_no:          { type: Number, required: true },
  item_name:      { type: String, required: true, trim: true },
  hsn_code:       { type: String, trim: true, default: '' },
  quantity:       { type: Number, required: true, min: 0 },
  rate:           { type: Number, required: true, min: 0 },
  taxable_value:  { type: Number, required: true, min: 0 },
  cgst_rate:      { type: Number, default: 0 },
  cgst_amount:    { type: Number, default: 0 },
  sgst_rate:      { type: Number, default: 0 },
  sgst_amount:    { type: Number, default: 0 },
  igst_rate:      { type: Number, default: 0 },
  igst_amount:    { type: Number, default: 0 },
  total:          { type: Number, required: true, min: 0 },
});

const estimateSchema = new mongoose.Schema({
  estimate_number:  { type: String, required: true, unique: true },
  estimate_date:    { type: Date, required: true, default: Date.now },
  valid_until:      { type: Date, default: null },
  status:           { type: String, enum: ['draft', 'sent', 'accepted', 'rejected'], default: 'draft' },

  // Inline client details (not linked to Clients collection)
  client_name:      { type: String, required: true, trim: true },
  client_address:   { type: String, default: '' },
  client_phone:     { type: String, default: '' },
  client_gst:       { type: String, default: '' },
  place_of_supply:  { type: String, default: '' },

  // GST type
  gst_type: { type: String, enum: ['CGST_SGST', 'IGST', 'NONE'], default: 'CGST_SGST' },
  cgst_rate: { type: Number, default: 9 },
  sgst_rate: { type: Number, default: 9 },
  igst_rate: { type: Number, default: 18 },

  items: [estimateItemSchema],

  // Totals
  subtotal:       { type: Number, default: 0 },
  cgst_amount:    { type: Number, default: 0 },
  sgst_amount:    { type: Number, default: 0 },
  igst_amount:    { type: Number, default: 0 },
  total_tax:      { type: Number, default: 0 },
  round_off:      { type: Number, default: 0 },
  grand_total:    { type: Number, default: 0 },
  amount_in_words: { type: String, default: '' },

  notes: { type: String, default: '' },
}, { timestamps: true });

// Separate counter for estimates
const estimateCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const EstimateCounter = mongoose.model('EstimateCounter', estimateCounterSchema);

module.exports = {
  Estimate: mongoose.model('Estimate', estimateSchema),
  EstimateCounter,
};
