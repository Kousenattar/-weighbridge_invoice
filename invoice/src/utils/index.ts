export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string | Date): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateInput(dateStr: string | Date): string {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertToWords(num: number): string {
  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + convertToWords(-num);
  let result = '';
  if (num >= 10000000) { result += convertToWords(Math.floor(num / 10000000)) + ' Crore '; num %= 10000000; }
  if (num >= 100000) { result += convertToWords(Math.floor(num / 100000)) + ' Lakh '; num %= 100000; }
  if (num >= 1000) { result += convertToWords(Math.floor(num / 1000)) + ' Thousand '; num %= 1000; }
  if (num >= 100) { result += ones[Math.floor(num / 100)] + ' Hundred '; num %= 100; }
  if (num >= 20) { result += tens[Math.floor(num / 10)] + ' '; num %= 10; }
  if (num > 0) result += ones[num] + ' ';
  return result.trim();
}

export function numberToWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let result = convertToWords(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + convertToWords(paise) + ' Paise';
  result += ' Only';
  return result;
}

export function calculateGST(subtotal: number, invoiceType: string, gstType: string, cgstRate = 9, sgstRate = 9, igstRate = 18) {
  let cgst = 0, sgst = 0, igst = 0, totalGST = 0;
  if (invoiceType === 'GST') {
    if (gstType === 'CGST_SGST') {
      cgst = (subtotal * cgstRate) / 100;
      sgst = (subtotal * sgstRate) / 100;
      totalGST = cgst + sgst;
    } else if (gstType === 'IGST') {
      igst = (subtotal * igstRate) / 100;
      totalGST = igst;
    }
  }
  const grandTotal = subtotal + totalGST;
  return { cgst_amount: cgst, sgst_amount: sgst, igst_amount: igst, total_gst: totalGST, grand_total: grandTotal };
}

export function getStateFromGST(gstNumber: string): { state: string; state_code: string } {
  const stateMap: Record<string, string> = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
    '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
    '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
    '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
    '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
    '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
    '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
    '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra',
    '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa',
    '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
    '34': 'Puducherry', '35': 'Andaman & Nicobar', '36': 'Telangana', '37': 'Andhra Pradesh (New)',
  };
  const code = gstNumber?.substring(0, 2) || '';
  return { state: stateMap[code] || 'Unknown', state_code: code };
}

export const INDIAN_STATES = [
  { name: 'Jammu & Kashmir', code: '01' }, { name: 'Himachal Pradesh', code: '02' },
  { name: 'Punjab', code: '03' }, { name: 'Chandigarh', code: '04' },
  { name: 'Uttarakhand', code: '05' }, { name: 'Haryana', code: '06' },
  { name: 'Delhi', code: '07' }, { name: 'Rajasthan', code: '08' },
  { name: 'Uttar Pradesh', code: '09' }, { name: 'Bihar', code: '10' },
  { name: 'Sikkim', code: '11' }, { name: 'Arunachal Pradesh', code: '12' },
  { name: 'Nagaland', code: '13' }, { name: 'Manipur', code: '14' },
  { name: 'Mizoram', code: '15' }, { name: 'Tripura', code: '16' },
  { name: 'Meghalaya', code: '17' }, { name: 'Assam', code: '18' },
  { name: 'West Bengal', code: '19' }, { name: 'Jharkhand', code: '20' },
  { name: 'Odisha', code: '21' }, { name: 'Chhattisgarh', code: '22' },
  { name: 'Madhya Pradesh', code: '23' }, { name: 'Gujarat', code: '24' },
  { name: 'Dadra & Nagar Haveli', code: '26' }, { name: 'Maharashtra', code: '27' },
  { name: 'Andhra Pradesh', code: '28' }, { name: 'Karnataka', code: '29' },
  { name: 'Goa', code: '30' }, { name: 'Lakshadweep', code: '31' },
  { name: 'Kerala', code: '32' }, { name: 'Tamil Nadu', code: '33' },
  { name: 'Puducherry', code: '34' }, { name: 'Andaman & Nicobar', code: '35' },
  { name: 'Telangana', code: '36' }, { name: 'Andhra Pradesh (New)', code: '37' },
];
