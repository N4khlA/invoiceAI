import { Currency } from "@/types";

// ─── Currency Formatting ──────────────────────────────────────────────────────

const LOCALES: Record<Currency, string> = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  BRL: "pt-BR",
  CAD: "en-CA",
  AUD: "en-AU",
  INR: "en-IN",
  JPY: "ja-JP",
};

export const CURRENCIES = Object.keys(LOCALES) as Currency[];

export function formatCurrency(
  amount: number,
  currency: Currency | string = "USD"
): string {
  const locale = LOCALES[currency as Currency] ?? "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "JPY" ? 0 : 2,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatCompactCurrency(
  amount: number,
  currency: Currency | string = "USD"
): string {
  const locale = LOCALES[currency as Currency] ?? "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return formatCurrency(amount, currency);
  }
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** yyyy-mm-dd for <input type="date"> */
export function toDateInput(date: Date): string {
  const tz = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tz).toISOString().slice(0, 10);
}

export function formatDateFull(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function getDaysOverdue(dueDate: string): number {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = now.getTime() - due.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function isOverdue(dueDate: string, status: string): boolean {
  if (status === "PAID" || status === "VOID") return false;
  return new Date(dueDate) < new Date();
}

// ─── Percentage Change ────────────────────────────────────────────────────────

export function formatChange(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

// ─── Invoice number generation (for display) ──────────────────────────────────

export function padInvoiceNumber(n: number): string {
  return `INV-${String(n).padStart(4, "0")}`;
}

// ─── cn utility ──────────────────────────────────────────────────────────────

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
