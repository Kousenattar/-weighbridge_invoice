/**
 * Convert a number to Indian words format
 * e.g., 118000 -> "One Lakh Eighteen Thousand Rupees Only"
 */
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];

const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertToWords(num) {
  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + convertToWords(-num);

  let result = '';

  if (num >= 10000000) {
    result += convertToWords(Math.floor(num / 10000000)) + ' Crore ';
    num %= 10000000;
  }
  if (num >= 100000) {
    result += convertToWords(Math.floor(num / 100000)) + ' Lakh ';
    num %= 100000;
  }
  if (num >= 1000) {
    result += convertToWords(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }
  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    result += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  }
  if (num > 0) {
    result += ones[num] + ' ';
  }

  return result.trim();
}

function numberToWords(amount) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = convertToWords(rupees) + ' Rupees';
  if (paise > 0) {
    result += ' and ' + convertToWords(paise) + ' Paise';
  }
  result += ' Only';
  return result;
}

module.exports = { numberToWords };
