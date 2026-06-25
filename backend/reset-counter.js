require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { Counter } = require('./models/Invoice');
const { EstimateCounter } = require('./models/Estimate');

async function run() {
  await connectDB();
  
  const type = process.argv[2]; // 'invoice' or 'estimate'
  const targetSeq = parseInt(process.argv[3], 10);
  
  if (!type || (type !== 'invoice' && type !== 'estimate') || isNaN(targetSeq)) {
    console.log('\nUsage: node reset-counter.js <type> <new_sequence_value>');
    console.log('  <type>                  "invoice" or "estimate"');
    console.log('  <new_sequence_value>    integer value');
    console.log('\nExamples:');
    console.log('  To make the NEXT invoice be CSR-099, set seq to 98:');
    console.log('    node reset-counter.js invoice 98');
    console.log('\n  To make the NEXT estimate be CSR-Q-050, set seq to 49:');
    console.log('    node reset-counter.js estimate 49');
    
    // Print current values
    try {
      const invCurrent = await Counter.findById('invoice_seq');
      console.log(`\n[Current Invoice Seq]: ${invCurrent ? invCurrent.seq : 'Not initialized'}`);
    } catch (e) {}
    try {
      const estCurrent = await EstimateCounter.findById('estimate_seq');
      console.log(`[Current Estimate Seq]: ${estCurrent ? estCurrent.seq : 'Not initialized'}`);
    } catch (e) {}
    
    process.exit(0);
  }
  
  if (type === 'invoice') {
    const updated = await Counter.findByIdAndUpdate(
      'invoice_seq',
      { seq: targetSeq },
      { new: true, upsert: true }
    );
    console.log(`\n✅ Invoice sequence updated successfully!`);
    console.log(`New sequence value: ${updated.seq}`);
    console.log(`The NEXT generated invoice number will be: CSR-${String(updated.seq + 1).padStart(3, '0')}`);
  } else if (type === 'estimate') {
    const updated = await EstimateCounter.findByIdAndUpdate(
      'estimate_seq',
      { seq: targetSeq },
      { new: true, upsert: true }
    );
    console.log(`\n✅ Estimate sequence updated successfully!`);
    console.log(`New sequence value: ${updated.seq}`);
    console.log(`The NEXT generated estimate number will be: CSR-Q-${String(updated.seq + 1).padStart(3, '0')}`);
  }
  
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
