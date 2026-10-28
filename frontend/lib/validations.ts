import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────

const passwordRules = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "Add at least one uppercase letter")
  .regex(/[0-9]/, "Add at least one number");

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name is too long"),
  email: z.string().email("Enter a valid email address"),
  password: passwordRules,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    newPassword: passwordRules,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordRules,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

/** Live checklist shown under password fields. */
export const PASSWORD_CHECKS: Array<{ label: string; test: (v: string) => boolean }> = [
  { label: "8+ characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One number", test: (v) => /[0-9]/.test(v) },
];

// ─── Client ───────────────────────────────────────────────────────────────────

const optionalText = (max: number, msg: string) => z.string().trim().max(max, msg).optional().or(z.literal(""));

export const clientSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(150, "Name is too long"),
  email: z.string().trim().email("Enter a valid email address"),
  company: optionalText(150, "Company name is too long"),
  phone: optionalText(40, "Phone number is too long"),
  address: optionalText(500, "Address is too long"),
  notes: optionalText(2000, "Notes are too long"),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

// ─── Invoice ──────────────────────────────────────────────────────────────────

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Describe the work").max(500, "Description is too long"),
  quantity: z
    .number({ invalid_type_error: "Enter a number" })
    .positive("Must be more than 0")
    .max(100_000, "Too large"),
  unitPrice: z
    .number({ invalid_type_error: "Enter a number" })
    .min(0, "Can't be negative")
    .max(1_000_000, "Too large"),
  taxPct: z
    .number({ invalid_type_error: "Enter a number" })
    .min(0, "Can't be negative")
    .max(100, "Max 100%"),
});

export const invoiceSchema = z
  .object({
    clientId: z.string().min(1, "Choose a client"),
    issueDate: z.string().min(1, "Issue date is required"),
    dueDate: z.string().min(1, "Due date is required"),
    currency: z.string().length(3),
    notes: z.string().max(2000, "Notes are too long").optional(),
    terms: z.string().max(2000, "Terms are too long").optional(),
    lineItems: z.array(lineItemSchema).min(1, "Add at least one line item").max(50, "Maximum 50 line items"),
  })
  .refine((d) => d.dueDate >= d.issueDate, {
    message: "Due date can't be before the issue date",
    path: ["dueDate"],
  });

export type LineItemFormValues = z.infer<typeof lineItemSchema>;
export type InvoiceFormValues = z.infer<typeof invoiceSchema>;

// ─── Account ─────────────────────────────────────────────────────────────────

export const businessSchema = z.object({
  bizName: z.string().trim().min(1, "Business name is required").max(120),
  name: optionalText(120, "Name is too long"),
  bizAddress: optionalText(300, "Address is too long"),
  bizPhone: optionalText(40, "Phone number is too long"),
  bizWebsite: z.string().trim().url("Enter a full URL, e.g. https://example.com").optional().or(z.literal("")),
  logoUrl: z.string().trim().url("Enter a full image URL").optional().or(z.literal("")),
  currency: z.string().length(3),
});

export type BusinessFormValues = z.infer<typeof businessSchema>;
