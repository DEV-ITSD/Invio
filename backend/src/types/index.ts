export type CustomerType = "company" | "private";

export interface Customer {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  countryCode?: string; // ISO 3166-1 alpha-2
  taxId?: string;
  reference?: string; // BuyerReference or order ref
  createdAt: Date;
  customerNumber?: number; // permanent sequential number, assigned at creation
  customerAbbreviation?: string; // 1-3 uppercase alphanumeric characters
  pdfName?: string; // safe customer-specific prefix used for downloaded PDF filenames
  customerType?: CustomerType;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  unitPrice: number;
  sku?: string;
  unit?: string; // piece, hour, day, kg, m, etc.
  category?: string; // service, goods, subscription, etc.
  taxDefinitionId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type InvoiceDocumentType = "invoice" | "receipt";
export type InvoiceTaxMode = "invoice" | "line" | "none";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  issueDate: Date;
  dueDate?: Date;
  currency: string;
  status: "draft" | "sent" | "complete" | "paid" | "overdue" | "voided";
  documentType: InvoiceDocumentType;
  taxMode: InvoiceTaxMode;
  taxText?: string;

  // Totals
  subtotal: number;
  discountAmount: number;
  discountPercentage: number;
  discountText?: string;
  taxRate: number;
  taxAmount: number;
  total: number;

  // Tax behavior flags
  pricesIncludeTax?: boolean; // whether unit prices are tax-inclusive
  roundingMode?: string; // 'line' or 'total'

  // Payment and notes
  paymentTerms?: string;
  notes?: string;

  // Locale overrides
  locale?: string;

  // System fields
  templateId?: string;
  templateVersionId?: string;
  templateHtmlSnapshot?: string;
  shareToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId?: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
  sortOrder: number;
  taxes?: InvoiceItemTax[];
}

export interface InvoiceAttachment {
  id: string;
  invoiceId: string;
  filename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

export type TemplateType = "local" | "remote" | "builtin";

export interface Template {
  id: string;
  name: string;
  html: string;
  isDefault: boolean;
  templateType: TemplateType;
  activeVersionId?: string;
  activeVersionNumber?: number;
  versionCount?: number;
  createdAt: Date;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  html: string;
  changeDescription?: string;
  source?: string;
  isBuiltin: boolean;
  isArchived: boolean;
  createdAt: Date;
  createdBy?: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface BusinessSettings {
  companyName: string;
  companyAddress?: string;
  companyCity?: string;
  companyPostalCode?: string;
  postalCityFormat?: "auto" | "city-postal" | "postal-city";
  companyEmail?: string;
  companyPhone?: string;
  companyTaxId?: string;
  companyCountryCode?: string; // ISO alpha-2
  currency: string;
  taxLabel?: string; // e.g. "GST", "VAT", "Sales tax"
  logo?: string;
  paymentMethods?: string;
  bankAccount?: string;
  paymentTerms?: string;
  defaultNotes?: string;
  locale?: string;
  invoiceDocumentTitle?: string;
  receiptDocumentTitle?: string;
}

// Normalized tax types
export interface TaxDefinition {
  id: string;
  code?: string;
  name?: string;
  percent: number;
  categoryCode?: string; // UBL: S, Z, E, etc.
  countryCode?: string;
  vendorSpecificId?: string;
  defaultIncluded?: boolean;
  metadata?: string; // JSON string
}

export interface InvoiceItemTax {
  id: string;
  invoiceItemId: string;
  taxDefinitionId?: string;
  percent: number;
  taxableAmount: number;
  amount: number;
  included: boolean;
  sequence?: number;
  note?: string;
}

export interface InvoiceTax {
  id: string;
  invoiceId: string;
  taxDefinitionId?: string;
  percent: number;
  taxableAmount: number;
  taxAmount: number;
}

// =============================================
// Multi-user system types
// =============================================

export const RESOURCES = [
  "invoices",
  "customers",
  "products",
  "templates",
  "settings",
  "tax_definitions",
  "users",
] as const;

export type Resource = (typeof RESOURCES)[number];

export const ACTIONS = [
  "read",
  "create",
  "update",
  "delete",
  "publish",
  "void",
  "export",
  "install",
] as const;

export type Action = (typeof ACTIONS)[number];

/** Defines which actions are meaningful for each resource */
export const RESOURCE_ACTIONS: Record<Resource, readonly Action[]> = {
  invoices: ["read", "create", "update", "delete", "publish", "void", "export"],
  customers: ["read", "create", "update", "delete"],
  products: ["read", "create", "update", "delete"],
  templates: ["read", "create", "update", "delete", "install"],
  settings: ["read", "update"],
  tax_definitions: ["read", "create", "update", "delete"],
  users: ["read", "create", "update", "delete"],
};

export interface Permission {
  resource: Resource;
  action: Action;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  isAdmin: boolean;
  isActive: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPermissions extends User {
  permissions: Permission[];
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email?: string;
  displayName?: string;
  isAdmin?: boolean;
  permissions?: Permission[];
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  displayName?: string;
  password?: string;
  isAdmin?: boolean;
  isActive?: boolean;
  permissions?: Permission[];
}

// Request/Response types for API
export interface CreateInvoiceRequest {
  customerId: string;
  invoiceNumber?: string;
  issueDate?: string | Date;
  dueDate?: string | Date;
  currency?: string;
  status?: "draft" | "sent" | "complete" | "paid" | "overdue" | "voided";
  documentType?: InvoiceDocumentType;
  templateId?: string;
  templateVersionId?: string;

  // Totals (optional, will be calculated if not provided)
  discountAmount?: number;
  discountPercentage?: number;
  discountText?: string;
  taxRate?: number;
  taxDefinitionId?: string | null;
  taxMode?: InvoiceTaxMode;
  taxText?: string;

  // Tax behavior flags
  pricesIncludeTax?: boolean;
  roundingMode?: string; // 'line' | 'total'

  // Payment and notes
  paymentTerms?: string;
  notes?: string;

  // Items
  items: {
    productId?: string;
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    notes?: string;
    // Optional per-line taxes (advanced). If omitted, falls back to invoice-level taxRate
    taxes?: Array<{
      percent: number; // e.g., 20 for 20%
      taxDefinitionId?: string;
      code?: string; // e.g., "S" (standard), "Z" (zero), etc.
      included?: boolean; // whether line unitPrice includes this tax
      note?: string;
    }>;
  }[];
}

export interface UpdateInvoiceRequest extends Partial<CreateInvoiceRequest> {
  id: string;
  paymentMethod?: string; // optionally record payment method when status → 'paid'
}

export interface CreateCustomerRequest {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  countryCode?: string; // ISO alpha-2
  taxId?: string;
  customerAbbreviation?: string;
  pdfName?: string;
  customerType?: CustomerType;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  notes?: string;
  unitPrice: number;
  sku?: string;
  unit?: string;
  category?: string;
  taxDefinitionId?: string;
}

export interface StatusHistoryEntry {
  id: string;
  invoiceId: string;
  status: string;
  changedAt: Date;
  paymentMethod?: string;
  note?: string;
}

export interface InvoiceWithDetails extends Invoice {
  customer: Customer;
  items: InvoiceItem[];
  attachments?: InvoiceAttachment[];
  taxes?: InvoiceTax[];
  statusHistory?: StatusHistoryEntry[];
}

// Template rendering context
import type { InvoiceLabels } from "../i18n/translations.ts";

export interface TemplateContext {
  // Company info
  companyName: string;
  companyAddress: string;
  companyCity?: string;
  companyPostalCode?: string;
  companyPostalCity?: string;
  companyEmail: string;
  companyPhone: string;
  companyTaxId?: string;

  // Invoice info
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  status: string;
  documentType: InvoiceDocumentType;
  documentTitle: string;
  isInvoice: boolean;
  isReceipt: boolean;
  showPaymentDetails: boolean;

  // Customer info
  customerName: string;
  customerContactName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerPostalCode?: string;
  customerCountryCode?: string;
  customerPostalCity?: string;
  customerTaxId?: string;
  customerType: CustomerType;
  isCompanyCustomer: boolean;
  isPrivateCustomer: boolean;

  // Items
  items: Array<{
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: string;
    lineTotal: string;
    notes?: string;
  }>;
  hasItemUnits?: boolean;

  // Totals
  subtotal: string;
  discountAmount?: string;
  discountPercentage?: number;
  discountText?: string;
  discountLabel: string;
  taxRate?: number; // kept for backward compatibility (single-rate mode)
  taxAmount?: string; // kept for backward compatibility
  total: string;
  // Advanced tax summary (grouped by rate/code)
  taxSummary?: Array<{
    label: string; // e.g., "VAT 20% (S)"
    percent: number;
    taxable: string; // formatted amount
    amount: string; // formatted amount
  }>;
  hasTaxSummary?: boolean;
  taxMode: InvoiceTaxMode;
  taxText?: string;
  zeroTaxAmount?: string;
  hasTaxText: boolean;

  // Flags
  hasDiscount: boolean;
  hasTax: boolean;

  // Payment info
  paymentTerms?: string;
  paymentMethods?: string;
  bankAccount?: string;

  // Notes
  notes?: string;

  // Internationalization
  locale: string;
  labels: InvoiceLabels;
}
