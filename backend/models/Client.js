const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  gst_number: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
  client_name: { type: String, required: true, trim: true },
  trade_name: { type: String, trim: true },
  address: { type: String, trim: true },
  state: { type: String, trim: true },
  state_code: { type: String, trim: true },
  gst_status: { type: String, trim: true },
  mobile: { type: String, trim: true },
  email: { type: String, trim: true },
  is_gst_registered: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);
