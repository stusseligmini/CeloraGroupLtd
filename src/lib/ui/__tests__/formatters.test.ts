/**
 * Formatters Tests
 */

import { describe, expect, it } from '@jest/globals';
import { formatCurrency } from '../formatters';

describe('formatCurrency', () => {
  it('should format USD currency correctly', () => {
    const result = formatCurrency(1234.56, 'USD');
    expect(result).toContain('1,234.56');
    expect(result).toContain('$');
  });

  it('should format EUR currency correctly', () => {
    const result = formatCurrency(1000, 'EUR');
    expect(result).toContain('1,000');
  });

  it('should handle zero value', () => {
    const result = formatCurrency(0, 'USD');
    expect(result).toContain('0.00');
  });

  it('should handle negative values', () => {
    const result = formatCurrency(-100, 'USD');
    expect(result).toContain('-100');
  });

  it('should handle invalid currency gracefully', () => {
    const result = formatCurrency(100, 'INVALID');
    expect(result).toContain('100.00');
  });

  it('should handle null/undefined value', () => {
    const result = formatCurrency(null as any, 'USD');
    expect(result).toContain('0.00');
  });

  it('should handle very large numbers', () => {
    const result = formatCurrency(1234567890.12, 'USD');
    expect(result).toContain('1,234,567,890.12');
  });

  it('should handle very small numbers', () => {
    const result = formatCurrency(0.01, 'USD');
    expect(result).toContain('0.01');
  });
});

