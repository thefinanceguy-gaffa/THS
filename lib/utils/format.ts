/**
 * Same server/client determinism concern semillaPOS's formatMoney documents:
 * Intl.NumberFormat("en-US", ...) is the one locale every JS engine's ICU
 * data agrees on — a Server Component's initial render and the browser's
 * hydration pass must produce byte-identical output or React throws a
 * hydration mismatch, so this deliberately never takes a `locale` param.
 *
 * THS OS's home currency is USD (DATABASE_SCHEMA.sql stores every money
 * column as *_usd) with ZiG as a display-time conversion — see
 * lib/utils/currency.ts for the toggle that drives `currency` here.
 */
export function formatMoney(amountUsd: number, currency: "USD" | "ZIG" = "USD", fxRateZigPerUsd = 13.85): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol" }).format(amountUsd);
  }
  const zig = amountUsd * fxRateZigPerUsd;
  return `Z$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(zig)}`;
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

export function formatPercent(value: number, maximumFractionDigits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(maximumFractionDigits)}%`;
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", options ?? { month: "short", day: "numeric", year: "numeric" }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
