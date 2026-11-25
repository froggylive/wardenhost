import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatMoney(cents: number, currency = "INR", symbol = "₹") {
  const amount = (cents / 100).toLocaleString("en-IN", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${amount}`;
}

export function formatDate(date: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", opts || { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function statusTone(status: string) {
  const s = status.toUpperCase();
  if (["PAID", "ACTIVE", "SUCCESS", "OPEN", "VERIFIED", "APPROVED"].includes(s))
    return "emerald";
  if (["PENDING", "UNPAID", "PROCESSING", "IN_PROGRESS", "AWAITING_PAYMENT", "AWAITING_CUSTOMER", "DRAFT"].includes(s))
    return "amber";
  if (["CANCELLED", "FAILED", "REFUNDED", "CLOSED", "EXPIRED", "SUSPENDED"].includes(s))
    return "rose";
  return "zinc";
}

export function prettyStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
