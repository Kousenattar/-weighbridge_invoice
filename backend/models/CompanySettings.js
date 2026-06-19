const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema({
  company_name: { type: String, required: true, default: 'CHOUDHARI SCALE REPAIRS' },
  gst_number: { type: String, required: true, default: '27AVYPM7309R1ZB' },
  address: { type: String, default: '3991 TAMBOLI GALLI SHANIWAR PETH, MIRAJ 416410' },
  mobile: { type: String, default: '9890615241,7773914556' },
  email: { type: String, default: 'choudhariscales@gmail.com' },
  state: { type: String, default: 'Maharashtra' },
  state_code: { type: String, default: '27' },
  bank_name: { type: String, default: 'Saraswat Bank' },
  account_holder: { type: String, default: 'CHOUDHARI SCALE REPAIRS' },
  account_number: { type: String, default: '61000000015462' },
  ifsc: { type: String, default: 'SRCB0000167' },
  terms: {
    type: [String],
    default: [
      'Goods once sold will not be taken back or exchange by any reason.',
      'If any claims arises the same to be settled in SANGLI jurisdiction only.',
      'Warranty Not Cover In Natural Disaster',
      'NOTE: We are not responsible for the loss of weighing goods by any reason of technical faulting electronic weighing machine.'
    ]
  },
  signatory_name: { type: String, default: 'AMIR KAMAL MAHER' },
  specialist_text: { type: String, default: 'SPECIALIST IN ALL TYPES OF WEIGHBRIGES & ELETRONIC WEIGHING SCALE' },
  invoice_prefix: { type: String, default: 'CSR' },
  logo_url: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('CompanySettings', companySettingsSchema);
