import { describe, it, expect } from 'vitest';
import { formatUsdt, formatRub, bigIntToUsdt, usdtToBigInt } from '../../client/src/lib/utils';

describe('Frontend Formatting Utilities', () => {
  describe('formatUsdt()', () => {
    it('should format USDT with exactly 2 decimal places', () => {
      expect(formatUsdt(99.97)).toBe('99.97');
      expect(formatUsdt(85.31)).toBe('85.31');
      expect(formatUsdt(0)).toBe('0.00');
      expect(formatUsdt(0.00)).toBe('0.00');
    });

    it('should round numbers to 2 decimal places', () => {
      expect(formatUsdt(99.999)).toBe('100.00');
      expect(formatUsdt(99.971)).toBe('99.97');
      expect(formatUsdt(0.001)).toBe('0.00');
    });

    it('should handle string input', () => {
      expect(formatUsdt('99.97')).toBe('99.97');
      expect(formatUsdt('0')).toBe('0.00');
    });

    it('should handle bigint input', () => {
      expect(formatUsdt(BigInt(9997000000))).toBe('99.97');
      expect(formatUsdt(BigInt(0))).toBe('0.00');
    });

    it('should handle invalid input gracefully', () => {
      expect(formatUsdt('invalid')).toBe('0.00');
      expect(formatUsdt(NaN)).toBe('0.00');
    });
  });

  describe('formatRub()', () => {
    it('should format RUB with thousand separators', () => {
      expect(formatRub(24172)).toBe('24 172');
      expect(formatRub(1523.45)).toBe('1 523');
      expect(formatRub(1000000)).toBe('1 000 000');
    });

    it('should handle small numbers without separators', () => {
      expect(formatRub(100)).toBe('100');
      expect(formatRub(999)).toBe('999');
    });

    it('should handle zero', () => {
      expect(formatRub(0)).toBe('0');
    });

    it('should handle string input', () => {
      expect(formatRub('24172')).toBe('24 172');
    });

    it('should handle invalid input gracefully', () => {
      expect(formatRub('invalid')).toBe('0');
      expect(formatRub(NaN)).toBe('0');
    });
  });

  describe('bigIntToUsdt() and usdtToBigInt() conversions', () => {
    it('should convert bigint to USDT correctly', () => {
      expect(bigIntToUsdt(BigInt(100000000))).toBe(1);
      expect(bigIntToUsdt(BigInt(9997000000))).toBe(99.97);
      expect(bigIntToUsdt(BigInt(0))).toBe(0);
    });

    it('should convert USDT to bigint correctly', () => {
      expect(usdtToBigInt(1)).toBe(BigInt(100000000));
      expect(usdtToBigInt(99.97)).toBe(BigInt(9997000000));
      expect(usdtToBigInt(0)).toBe(BigInt(0));
    });

    it('should handle string input for usdtToBigInt', () => {
      expect(usdtToBigInt('99.97')).toBe(BigInt(9997000000));
      expect(usdtToBigInt('0')).toBe(BigInt(0));
    });

    it('should handle invalid input gracefully', () => {
      expect(usdtToBigInt('invalid')).toBe(BigInt(0));
      expect(usdtToBigInt(NaN)).toBe(BigInt(0));
    });

    it('should maintain precision in round-trip conversion', () => {
      const original = 99.97;
      const converted = bigIntToUsdt(usdtToBigInt(original));
      expect(converted).toBe(original);
    });

    it('should handle large amounts', () => {
      const large = 20000;
      expect(bigIntToUsdt(usdtToBigInt(large))).toBe(large);
    });
  });
});
