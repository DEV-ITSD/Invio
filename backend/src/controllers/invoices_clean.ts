import { getDatabase } from "../database/init.ts";
import { Invoice } from "../types/index.ts";
import { generateUUID } from "../utils/uuid.ts";

export const createInvoice = (data: Partial<Invoice>) => {
  const db = getDatabase();
  const invoiceId = generateUUID();
  const shareToken = generateUUID();

  const invoice: Invoice = {
    id: invoiceId,
    invoiceNumber: data.invoiceNumber || `INV-${Date.now()}`,
    customerId: data.customerId!,
    issueDate: data.issueDate || new Date(),
    dueDate: data.dueDate,
    currency: data.currency || "USD",
    status: data.status || "draft",
    documentType: data.documentType || "invoice",
    taxMode: data.taxMode || "invoice",
    taxText: data.taxText,

    // Totals
    subtotal: data.subtotal || 0,
    discountAmount: data.discountAmount || 0,
    discountPercentage: data.discountPercentage || 0,
    taxRate: data.taxRate || 0,
    taxAmount: data.taxAmount || 0,
    total: data.total || 0,

    // Payment and notes
    paymentTerms: data.paymentTerms,
    notes: data.notes,

    // System fields
    shareToken: shareToken,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  db.query(
    `INSERT INTO invoices (
      id, invoice_number, customer_id, issue_date, due_date, currency, status,
      subtotal, discount_amount, discount_percentage, tax_rate, tax_amount, total,
      payment_terms, notes, share_token, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invoice.id,
      invoice.invoiceNumber,
      invoice.customerId,
      invoice.issueDate,
      invoice.dueDate,
      invoice.currency,
      invoice.status,
      invoice.subtotal,
      invoice.discountAmount,
      invoice.discountPercentage,
      invoice.taxRate,
      invoice.taxAmount,
      invoice.total,
      invoice.paymentTerms,
      invoice.notes,
      invoice.shareToken,
      invoice.createdAt,
      invoice.updatedAt,
    ],
  );

  return invoice;
};

export const getInvoices = () => {
  const db = getDatabase();
  return db.query("SELECT * FROM invoices");
};

export const getInvoiceById = (id: string) => {
  const db = getDatabase();
  const result = db.query("SELECT * FROM invoices WHERE id = ?", [id]);
  return result.length > 0 ? result[0] : null;
};

export const getInvoiceByShareToken = (shareToken: string) => {
  const db = getDatabase();
  const result = db.query("SELECT * FROM invoices WHERE share_token = ?", [
    shareToken,
  ]);
  return result.length > 0 ? result[0] : null;
};

export const updateInvoice = (id: string, data: Partial<Invoice>) => {
  const db = getDatabase();
  db.query(
    `UPDATE invoices SET 
      invoice_number = ?, customer_id = ?, issue_date = ?, due_date = ?, currency = ?, status = ?,
      subtotal = ?, discount_amount = ?, discount_percentage = ?, tax_rate = ?, tax_amount = ?, total = ?,
      payment_terms = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    [
      data.invoiceNumber,
      data.customerId,
      data.issueDate,
      data.dueDate,
      data.currency,
      data.status,
      data.subtotal,
      data.discountAmount,
      data.discountPercentage,
      data.taxRate,
      data.taxAmount,
      data.total,
      data.paymentTerms,
      data.notes,
      new Date(),
      id,
    ],
  );
  return getInvoiceById(id);
};

export const deleteInvoice = (id: string) => {
  const db = getDatabase();
  db.query("DELETE FROM invoices WHERE id = ?", [id]);
  return true;
};

export const publishInvoice = (id: string) => {
  const shareToken = generateUUID();
  const db = getDatabase();
  db.query(
    "UPDATE invoices SET share_token = ?, status = 'sent' WHERE id = ?",
    [shareToken, id],
  );
  return { shareToken };
};
