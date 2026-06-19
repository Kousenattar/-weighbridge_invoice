require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const CompanySettings = require('./models/CompanySettings');

async function seed() {
  await connectDB();
  
  // Seed admin user
  const existing = await User.findOne({ email: 'admin@gst.com' });
  if (!existing) {
    await User.create({ name: 'Admin', email: 'admin@gst.com', password: 'admin123', role: 'admin' });
    console.log('✅ Admin user created: admin@gst.com / admin123');
  } else {
    console.log('ℹ️  Admin user already exists');
  }
  
  // Seed company settings
  const settings = await CompanySettings.findOne();
  if (!settings) {
    await CompanySettings.create({
      company_name: 'CHOUDHARI SCALE REPAIRS',
      gst_number: '27AVYPM7309R1ZB',
      address: '3991 TAMBOLI GALLI SHANIWAR PETH, MIRAJ 416410',
      mobile: '9890615241,7773914556',
      email: 'choudhariscales@gmail.com',
      state: 'Maharashtra',
      state_code: '27',
      bank_name: 'Saraswat Bank',
      account_holder: 'CHOUDHARI SCALE REPAIRS',
      account_number: '61000000015462',
      ifsc: 'SRCB0000167',
      terms: [
        'Goods once sold will not be taken back or exchange by any reason.',
        'If any claims arises the same to be settled in SANGLI jurisdiction only.',
        'Warranty Not Cover In Natural Disaster',
        'NOTE: We are not responsible for the loss of weighing goods by any reason of technical faulting electronic weighing machine.'
      ],
      signatory_name: 'AMIR KAMAL MAHER',
      specialist_text: 'SPECIALIST IN ALL TYPES OF WEIGHBRIGES & ELETRONIC WEIGHING SCALE',
      invoice_prefix: 'CSR',
    });
    console.log('✅ Company settings seeded');
  } else {
    console.log('ℹ️  Company settings already exist');
  }
  
  console.log('\n🎉 Seed complete!');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
