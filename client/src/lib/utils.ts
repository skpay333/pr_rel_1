import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format USDT amount with exactly 2 decimal places
 * Examples: 99.97, 85.31, 0.00
 */
export function formatUsdt(value: number | string | bigint): string {
  const num = typeof value === 'bigint' ? bigIntToUsdt(value) : Number(value);
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
}

/**
 * Format RUB amount with thousand separators and 2 decimals
 * Examples: 24 172.00, 1 523.45
 */
export function formatRub(value: number | string): string {
  const num = Number(value);
  if (isNaN(num)) return '0';
  return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Convert BigInt (8 decimal precision) to USDT number
 * Backend stores USDT as BigInt with 8 decimals
 */
export function bigIntToUsdt(value: bigint): number {
  return Number(value) / 100000000;
}

/**
 * Convert USDT number to BigInt (8 decimal precision)
 * For sending to backend
 */
export function usdtToBigInt(value: number | string): bigint {
  const num = Number(value);
  if (isNaN(num)) return BigInt(0);
  return BigInt(Math.round(num * 100000000));
}

/**
 * Format date/time in Moscow timezone (MSK)
 * Examples: 16.11.2025, 14:49 МСК
 */
export function formatMskDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  }) + ' МСК';
}

/**
 * Format date only in Moscow timezone (MSK)
 * Examples: 16.11.2025
 */
export function formatMskDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
  });
}

/**
 * Format time only in Moscow timezone (MSK)
 * Examples: 14:49 МСК
 */
export function formatMskTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  return date.toLocaleString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  }) + ' МСК';
}

/**
 * Format payable USDT amount with full precision (8 decimals)
 * Removes trailing zeros but keeps enough precision to show uniqueness
 * Examples: 100 → "100.00", 100.00000001 → "100.00000001", 99.99999999 → "99.99999999"
 */
export function formatPayableUsdt(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0.00';
  
  const num = Number(value);
  if (isNaN(num)) return '0.00';
  
  const fixed8 = num.toFixed(8);
  const trimmed = fixed8.replace(/\.?0+$/, '');
  
  if (trimmed.indexOf('.') === -1) {
    return trimmed + '.00';
  }
  
  const [, decimals] = trimmed.split('.');
  if (!decimals || decimals.length < 2) {
    return num.toFixed(2);
  }
  
  return trimmed;
}
