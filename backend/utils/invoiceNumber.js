const { Invoice, Counter } = require('../models/Invoice');

async function generateInvoiceNumber(prefix = 'CSR') {
  const counter = await Counter.findByIdAndUpdate(
    'invoice_seq',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${String(counter.seq).padStart(3, '0')}`;
}

module.exports = { generateInvoiceNumber };
