import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    businessName: z
      .string()
      .min(2, "Business name must be at least 2 characters")
      .max(100, "Business name is too long"),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// ─── Client ───────────────────────────────────────────────────────────────────

export const clientSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(150, "Name is too long"),
  email: z.string().email("Enter a valid email address"),
  address: z.string().max(500, "Address is too long").optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

// ─── Invoice ──────────────────────────────────────────────────────────────────

export const lineItemSchema = z.object({
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description is too long"),
  quantity: z
    .number({ invalid_type_error: "Must be a number" })
    .positive("Must be > 0")
    .max(100_000, "Too large"),
  unitPrice: z
    .number({ invalid_type_error: "Must be a number" })
    .min(0, "Must be ≥ 0")
    .max(1_000_000, "Too large"),
  taxPercent: z
    .number({ invalid_type_error: "Must be a number" })
    .min(0, "Must be ≥ 0")
    .max(100, "Must be ≤ 100"),
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1, "Select a client"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  currency: z.enum(["USD", "EUR", "GBP", "BRL", "CAD", "AUD", "INR"]).default("USD"),
  poNumber: z.string().max(100, "PO number too long").optional(),
  notes: z.string().max(2000, "Notes too long").optional(),
  terms: z.string().max(2000, "Terms too long").optional(),
  lineItems: z
    .array(lineItemSchema)
    .min(1, "Add at least one line item")
    .max(50, "Maximum 50 line items"),
});

export type LineItemFormValues = z.infer<typeof lineItemSchema>;
export type InvoiceFormValues = z.infer<typeof invoiceSchema>;

// ─── Account ─────────────────────────────────────────────────────────────────

export const accountSchema = z.object({
  businessName: z.string().min(2).max(100),
  businessAddress: z.string().max(500).optional(),
  currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD", "INR"]),
  aiTone: z.enum(["FORMAL", "FRIENDLY", "FIRM"]),
  readReceipts: z.boolean(),
});

export type AccountFormValues = z.infer<typeof accountSchema>;
