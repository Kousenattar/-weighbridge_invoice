const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use gemini-2.5-flash — multimodal, fast, supports image + PDF input, free quota available
const MODEL = 'gemini-2.5-flash';

const EXTRACTION_PROMPT = `You are an expert at reading Indian GST purchase bills/invoices.

Analyse the provided bill image carefully and extract ALL information into the following JSON structure.
Return ONLY raw JSON — no markdown, no code fences, no explanation.

{
  "bill_no": "bill/invoice number as printed on the document",
  "purchase_date": "date in YYYY-MM-DD format",
  "supplier_name": "legal name or trade name of the seller/supplier",
  "supplier_gst": "15-character GST number of the supplier (uppercase, or empty string if not found)",
  "supplier_address": "full address of the supplier",
  "supplier_state": "state name in English (e.g. Maharashtra)",
  "supplier_state_code": "2-digit state code (e.g. 27)",
  "gst_type": "one of: CGST_SGST | IGST | NONE — use CGST_SGST if bill shows CGST+SGST, IGST if it shows IGST, NONE if no GST",
  "cgst_rate": number (e.g. 9 for 9%, 0 if not applicable),
  "sgst_rate": number (e.g. 9 for 9%, 0 if not applicable),
  "igst_rate": number (e.g. 18 for 18%, 0 if not applicable),
  "items": [
    {
      "item_name": "product/service description",
      "hsn_code": "HSN/SAC code as printed (or empty string)",
      "quantity": number,
      "rate": number (price per unit, excluding GST)
    }
  ],
  "notes": "any extra info like PO number, transport, remarks (or empty string)"
}

Rules:
- If a field is not visible or not applicable, use empty string "" or 0 for numbers.
- For items, extract EVERY line item separately.
- Rate should be the base rate BEFORE GST.
- If the bill has a single GST rate (e.g. 18%), split into cgst_rate=9 and sgst_rate=9 if gst_type is CGST_SGST.
- Dates must be YYYY-MM-DD. If only month/year visible, use the 1st of that month.
- Do NOT include the grand_total or subtotal — we will calculate these ourselves.`;

/**
 * Extract purchase bill data from an image or PDF buffer.
 * @param {Buffer} fileBuffer  - raw file bytes
 * @param {string} mimeType    - e.g. "image/jpeg", "image/png", "application/pdf"
 * @returns {Promise<Object>}  - structured purchase data
 */
async function extractBillData(fileBuffer, mimeType) {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const imagePart = {
    inlineData: {
      data: fileBuffer.toString('base64'),
      mimeType,
    },
  };

  const result   = await model.generateContent([EXTRACTION_PROMPT, imagePart]);
  const response = await result.response;
  const text     = response.text().trim();

  // Strip any accidental markdown fences
  const jsonText = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  const parsed = JSON.parse(jsonText);

  // Sanitise and ensure correct types
  return {
    bill_no:             String(parsed.bill_no             || '').trim(),
    purchase_date:       String(parsed.purchase_date       || '').trim(),
    supplier_name:       String(parsed.supplier_name       || '').trim(),
    supplier_gst:        String(parsed.supplier_gst        || '').toUpperCase().trim(),
    supplier_address:    String(parsed.supplier_address    || '').trim(),
    supplier_state:      String(parsed.supplier_state      || '').trim(),
    supplier_state_code: String(parsed.supplier_state_code || '').trim(),
    gst_type:            ['CGST_SGST', 'IGST', 'NONE'].includes(parsed.gst_type)
                           ? parsed.gst_type : 'NONE',
    cgst_rate:           Number(parsed.cgst_rate) || 0,
    sgst_rate:           Number(parsed.sgst_rate) || 0,
    igst_rate:           Number(parsed.igst_rate) || 0,
    notes:               String(parsed.notes || '').trim(),
    items: Array.isArray(parsed.items)
      ? parsed.items.map((item, idx) => ({
          item_name: String(item.item_name || '').trim(),
          hsn_code:  String(item.hsn_code  || '').trim(),
          quantity:  Number(item.quantity)  || 1,
          rate:      Number(item.rate)      || 0,
        })).filter(i => i.item_name)
      : [],
  };
}

module.exports = { extractBillData };
