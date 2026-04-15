import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPhone, formatVIN, formatMinutes } from '@/core/utils/formatting';

describe('Formatting utilities', () => {
  describe('formatCurrency', () => {
    it('should format USD currency', () => {
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(1234.5)).toBe('$1,234.50');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle negative amounts', () => {
      expect(formatCurrency(-100)).toBe('-$100.00');
    });
  });

  describe('formatPhone', () => {
    it('should format 10-digit phone number', () => {
      expect(formatPhone('1234567890')).toBe('(123) 456-7890');
    });

    it('should return empty string for non-numeric input', () => {
      expect(formatPhone('abc')).toBe('');
    });
  });

  describe('formatVIN', () => {
    it('should uppercase VIN', () => {
      expect(formatVIN('1hscm21606a123456')).toBe('1HSCM21606A123456');
    });

    it('should remove invalid characters', () => {
      expect(formatVIN('1HSC-M21606A123456')).toBe('1HSCM21606A123456');
    });
  });

  describe('formatMinutes', () => {
    it('should format minutes as HH:MM', () => {
      expect(formatMinutes(65)).toBe('1:05');
      expect(formatMinutes(0)).toBe('0:00');
      expect(formatMinutes(125)).toBe('2:05');
    });
  });
});
