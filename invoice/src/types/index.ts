export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface CompanySettings {
  _id?: string;
  company_name: string;
  gst_number: string;
  address: string;
  mobile: string;
  email: string;
  state: string;
  state_code: string;
  bank_name: string;
  account_holder: string;
  account_number: string;
  ifsc: string;
  terms: string[];
  signatory_name: string;
  specialist_text: string;
  invoice_prefix: string;
  logo_url?: string;
}

export interface Client {
  _id: string;
  gst_number?: string;
  client_name: string;
  trade_name?: string;
  address?: string;
  state?: string;
  state_code?: string;
  gst_status?: string;
  mobile?: string;
  email?: string;
  is_gst_registered: boolean;
  createdAt?: string;
}

export interface InvoiceItem {
  _id?: string;
  sr_no: number;
  item_name: string;
  hsn_code?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export type InvoiceType = 'GST' | 'NON_GST';
export type GSTType = 'CGST_SGST' | 'IGST' | 'NONE';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export interface Invoice {
  _id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  gst_type: GSTType;
  client: Client;
  invoice_date: string;
  items: InvoiceItem[];
  subtotal: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_gst: number;
  grand_total: number;
  amount_in_words: string;
  eway_bill?: string;
  notes?: string;
  status: InvoiceStatus;
  pdf_url?: string;
  is_duplicate_of?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  totalInvoices: number;
  gstInvoices: number;
  nonGstInvoices: number;
  monthlySales: number;
  recentInvoices: Invoice[];
  monthlyData: { month: string; total: number; count: number }[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── Purchase Types ───────────────────────────────────────────────────────────

export interface PurchaseItem {
  _id?: string;
  sr_no: number;
  item_name: string;
  hsn_code?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export type PurchaseGSTType = 'CGST_SGST' | 'IGST' | 'NONE';

export interface Purchase {
  _id: string;
  bill_no: string;
  purchase_date: string;
  supplier_name: string;
  supplier_address?: string;
  supplier_gst?: string;
  supplier_state?: string;
  supplier_state_code?: string;
  gst_type: PurchaseGSTType;
  items: PurchaseItem[];
  subtotal: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_gst: number;
  grand_total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseSummary {
  overall: {
    count?: number;
    subtotal?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    total_gst?: number;
    grand_total?: number;
  };
  monthly: { month: string; total_gst: number; grand_total: number }[];
}

export interface InvoiceFormData {
  invoice_type: InvoiceType;
  gst_type: GSTType;
  client_id: string;
  client_data?: Partial<Client>;
  invoice_date: string;
  items: Omit<InvoiceItem, '_id' | 'sr_no'>[];
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  eway_bill?: string;
  notes?: string;
}
