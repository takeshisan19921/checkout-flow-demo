import { describe, expect, it } from 'vitest';
import {
  applyCoupon,
  calculateTotals,
  formatCents,
  formatCardNumber,
  formatExpiry,
  isExpired,
  normalizePostcode,
  passesLuhn,
  validateAddress,
  validatePayment,
} from './checkout';
import type { CartLine } from './types';

const line = (unitPriceCents: number, quantity = 1): CartLine => ({
  sku: 'X',
  name: 'Item',
  variant: '',
  quantity,
  unitPriceCents,
});

describe('calculateTotals', () => {
  it('charges shipping below the free shipping threshold', () => {
    expect(calculateTotals([line(2000, 2)], 'standard', null)).toMatchObject({
      subtotalCents: 4000,
      shippingCents: 495,
      totalCents: 4495,
    });
  });

  it('gives free standard shipping from € 75 but still charges express', () => {
    expect(calculateTotals([line(7500)], 'standard', null).shippingCents).toBe(0);
    expect(calculateTotals([line(7500)], 'express', null).shippingCents).toBe(995);
  });

  it('judges free shipping after the discount', () => {
    // € 80 minus 10% is € 72, which is below the € 75 threshold.
    expect(calculateTotals([line(8000)], 'standard', 'WELCOME10')).toMatchObject({
      discountCents: 800,
      shippingCents: 495,
      totalCents: 7695,
    });
  });

  it('reports the VAT included in the total', () => {
    expect(calculateTotals([line(12100)], 'standard', null).vatCents).toBe(2100);
  });

  it('charges nothing for an empty cart', () => {
    expect(calculateTotals([], 'express', null).totalCents).toBe(0);
  });
});

describe('applyCoupon', () => {
  it('accepts codes regardless of case and spacing', () => {
    expect(applyCoupon('  welcome10 ', 1000)).toMatchObject({ ok: true, code: 'WELCOME10' });
  });

  it('explains unknown codes and unmet minimums', () => {
    expect(applyCoupon('FREE', 1000)).toEqual({ ok: false, message: 'FREE is not a valid code.' });
    expect(applyCoupon('SAVE15', 9999)).toEqual({
      ok: false,
      message: 'SAVE15 needs a subtotal of at least ' + formatCents(10000) + '.',
    });
  });
});

describe('address validation', () => {
  const valid = { fullName: 'Sanne de Vries', email: 'sanne@example.com', street: 'Keizersgracht 12', postcode: '1015cs', city: 'Amsterdam' };

  it('accepts a postcode without a space and normalizes it', () => {
    expect(validateAddress(valid)).toEqual({});
    expect(normalizePostcode('1015cs')).toBe('1015 CS');
  });

  it('rejects postcodes starting with 0 and the unissued letter pairs', () => {
    expect(validateAddress({ ...valid, postcode: '0123 AB' }).postcode).toBeDefined();
    expect(validateAddress({ ...valid, postcode: '1234 SS' }).postcode).toBeDefined();
  });

  it('asks for a house number', () => {
    expect(validateAddress({ ...valid, street: 'Keizersgracht' }).street).toBe('Add your house number.');
  });
});

describe('payment validation', () => {
  it('formats card numbers and expiry dates while typing', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatCardNumber('4242-42')).toBe('4242 42');
    expect(formatExpiry('1228')).toBe('12/28');
    expect(formatExpiry('1')).toBe('1');
  });

  it('runs the Luhn check', () => {
    expect(passesLuhn('4242 4242 4242 4242')).toBe(true);
    expect(passesLuhn('4242 4242 4242 4241')).toBe(false);
  });

  it('keeps a card valid through the end of its expiry month', () => {
    expect(isExpired('10/26', '2026-10-31')).toBe(false);
    expect(isExpired('09/26', '2026-10-01')).toBe(true);
  });

  it('reports each payment field separately', () => {
    expect(validatePayment({ cardName: '', cardNumber: '1234', expiry: '13/30', cvc: '1' }, '2026-10-18')).toEqual({
      cardName: 'Enter the name on the card.',
      cardNumber: 'Check the card number, it is not valid.',
      expiry: 'Enter the expiry date as MM/YY.',
      cvc: 'Enter the 3 or 4 digit security code.',
    });
  });
});
