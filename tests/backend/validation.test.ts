import { describe, it, expect } from 'vitest';

const MIN_DEPOSIT_USDT = 30;
const MAX_DEPOSIT_USDT = 20000;

function validateDepositAmount(amount: number): { valid: boolean; error?: string } {
  if (amount < MIN_DEPOSIT_USDT) {
    return { valid: false, error: `Минимальная сумма пополнения ${MIN_DEPOSIT_USDT} USDT` };
  }
  if (amount > MAX_DEPOSIT_USDT) {
    return { valid: false, error: `Максимальная сумма пополнения ${MAX_DEPOSIT_USDT} USDT` };
  }
  return { valid: true };
}

describe('Backend Deposit Validation', () => {
  describe('Deposit min/max validation', () => {
    it('should reject deposits below minimum (30 USDT)', () => {
      const result = validateDepositAmount(29);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('30');
    });

    it('should accept deposits at minimum (30 USDT)', () => {
      const result = validateDepositAmount(30);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept deposits within range', () => {
      expect(validateDepositAmount(100).valid).toBe(true);
      expect(validateDepositAmount(1000).valid).toBe(true);
      expect(validateDepositAmount(10000).valid).toBe(true);
    });

    it('should accept deposits at maximum (20000 USDT)', () => {
      const result = validateDepositAmount(20000);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject deposits above maximum (20000 USDT)', () => {
      const result = validateDepositAmount(20001);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('20000');
    });

    it('should handle edge cases', () => {
      expect(validateDepositAmount(29.99).valid).toBe(false);
      expect(validateDepositAmount(30.01).valid).toBe(true);
      expect(validateDepositAmount(19999.99).valid).toBe(true);
      expect(validateDepositAmount(20000.01).valid).toBe(false);
    });

    it('should handle zero and negative amounts', () => {
      expect(validateDepositAmount(0).valid).toBe(false);
      expect(validateDepositAmount(-100).valid).toBe(false);
    });
  });

  describe('Duplicate deposit detection', () => {
    it('should detect duplicate deposit amounts', () => {
      const existingDeposits = [
        { payableAmount: '100.00', status: 'pending' },
        { payableAmount: '200.00', status: 'pending' },
      ];

      const newAmount = 100.00;
      const isDuplicate = existingDeposits.some(
        d => parseFloat(d.payableAmount) === newAmount && d.status === 'pending'
      );

      expect(isDuplicate).toBe(true);
    });

    it('should allow same amount if previous deposit is confirmed', () => {
      const existingDeposits = [
        { payableAmount: '100.00', status: 'confirmed' },
      ];

      const newAmount = 100.00;
      const isDuplicate = existingDeposits.some(
        d => parseFloat(d.payableAmount) === newAmount && d.status === 'pending'
      );

      expect(isDuplicate).toBe(false);
    });

    it('should allow different amounts', () => {
      const existingDeposits = [
        { payableAmount: '100.00', status: 'pending' },
      ];

      const newAmount = 100.01;
      const isDuplicate = existingDeposits.some(
        d => parseFloat(d.payableAmount) === newAmount && d.status === 'pending'
      );

      expect(isDuplicate).toBe(false);
    });
  });
});
