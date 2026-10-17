import { describe, it, expect } from 'vitest';
import {
  calculateInvoiceFinancials,
  isSupplyInterState,
  roundToTwo,
} from '../src/services/gstCalculator.js';

describe('GST Calculator Service', () => {
  it('correctly detects intra-state vs inter-state supply', () => {
    expect(isSupplyInterState('Delhi', 'Delhi')).toBe(false);
    expect(isSupplyInterState('Delhi', 'Karnataka')).toBe(true);
    expect(isSupplyInterState('delhi', 'DELHI ')).toBe(false);
  });

  it('correctly calculates intra-state (CGST + SGST split 50/50)', () => {
    const items = [
      {
        description: 'Web development service',
        hsnSacCode: '998314',
        quantity: 1,
        unitPrice: 10000,
        discountPercent: 10, // 10% discount -> taxable 9000
        gstRate: 18,
      },
    ];

    const result = calculateInvoiceFinancials(items, false, true);
    expect(result.subtotal).toBe(10000);
    expect(result.discountTotal).toBe(1000);
    expect(result.taxableAmount).toBe(9000);
    // CGST 9% of 9000 = 810, SGST 9% of 9000 = 810
    expect(result.cgstTotal).toBe(810);
    expect(result.sgstTotal).toBe(810);
    expect(result.igstTotal).toBe(0);
    expect(result.taxTotal).toBe(1620);
    expect(result.totalAmount).toBe(10620);
  });

  it('correctly calculates inter-state (IGST full)', () => {
    const items = [
      {
        description: 'Cloud hosting maintenance',
        hsnSacCode: '998315',
        quantity: 2,
        unitPrice: 5000,
        discountPercent: 0,
        gstRate: 18,
      },
    ];

    const result = calculateInvoiceFinancials(items, true, true);
    expect(result.subtotal).toBe(10000);
    expect(result.taxableAmount).toBe(10000);
    expect(result.cgstTotal).toBe(0);
    expect(result.sgstTotal).toBe(0);
    expect(result.igstTotal).toBe(1800);
    expect(result.totalAmount).toBe(11800);
  });

  it('handles safe round off calculation', () => {
    const items = [
      {
        description: 'Consulting item with odd fractions',
        hsnSacCode: '998314',
        quantity: 3,
        unitPrice: 333.33,
        discountPercent: 0,
        gstRate: 18,
      },
    ];

    const result = calculateInvoiceFinancials(items, false, true);
    expect(result.totalAmount).toBe(Math.round(result.taxableAmount + result.taxTotal));
  });
});
