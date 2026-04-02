import { Currency } from "@/types";

// ─── Currency Formatting ──────────────────────────────────────────────────────

const LOCALES: Record<Currency, string> = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  CAD: "en-CA",
  AUD: "en-AU",
  INR: "en-IN",
  JPY: "ja-JP",
};

export function formatCurrency(
  amount: number,
  currency: Currency = "USD"
): string {
  return new Intl.NumberFormat(LOCALES[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(
  amount: number,
  currency: Currency = "USD"
): string {
  if (amount >= 1_000_000) {
    return `${formatCurrency(amount / 1_000_000, currency).replace(/\.\d+/, "")}M`;
  }
  if (amount >= 1_000) {
    return `${formatCurrency(amount / 1_000, currency).replace(/\.\d+/, "")}k`;
  }
  return formatCurrency(amount, currency);
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateFull(dateString: string): string {
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
