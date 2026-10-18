import type { Address, CartLine, DeliveryOption, FieldErrors, Payment } from './types';

export const FREE_SHIPPING_FROM_CENTS = 7500;
export const VAT_RATE = 0.21;

export const deliveryOptions: Record<DeliveryOption, { label: string; detail: string; priceCents: number }> = {
  standard: { label: 'Standard', detail: '2–3 working days', priceCents: 495 },
  express: { label: 'Express', detail: 'Next working day, ordered before 22:00', priceCents: 995 },
  pickup: { label: 'Pickup point', detail: 'Collect from a nearby pickup point', priceCents: 295 },
};

interface Coupon {
  label: string;
  /** Percentage off the subtotal, or a fixed amount in cents. Never both. */
  percentOff?: number;
  amountOffCents?: number;
  minSubtotalCents?: number;
}

const coupons: Record<string, Coupon> = {
  WELCOME10: { label: '10% off your first order', percentOff: 10 },
  SAVE15: { label: '€ 15 off orders over € 100', amountOffCents: 1500, minSubtotalCents: 10000 },
};

const euro = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });
export const formatCents = (cents: number): string => euro.format(cents / 100);

export type CouponResult = { ok: true; code: string; label: string } | { ok: false; message: string };

export function applyCoupon(input: string, subtotalCents: number): CouponResult {
  const code = input.trim().toUpperCase();
  if (!code) return { ok: false, message: 'Enter a discount code.' };
  const coupon = coupons[code];
  if (!coupon) return { ok: false, message: `${code} is not a valid code.` };
  if (coupon.minSubtotalCents && subtotalCents < coupon.minSubtotalCents) {
    return { ok: false, message: `${code} needs a subtotal of at least ${formatCents(coupon.minSubtotalCents)}.` };
  }
  return { ok: true, code, label: coupon.label };
}

export interface Totals {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  /** VAT already included in the total, shown for information as Dutch receipts do. */
  vatCents: number;
}

/**
 * Prices include VAT. The discount applies to items only, free shipping is
 * judged on the subtotal after the discount, and the total never goes below zero.
 */
export function calculateTotals(lines: readonly CartLine[], delivery: DeliveryOption, couponCode: string | null): Totals {
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const coupon = couponCode ? coupons[couponCode] : undefined;
  let discountCents = 0;
  if (coupon && subtotalCents >= (coupon.minSubtotalCents ?? 0)) {
    discountCents = coupon.percentOff
      ? Math.round((subtotalCents * coupon.percentOff) / 100)
      : Math.min(coupon.amountOffCents ?? 0, subtotalCents);
  }
  const afterDiscount = subtotalCents - discountCents;
  const shippingCents =
    subtotalCents === 0 || (delivery !== 'express' && afterDiscount >= FREE_SHIPPING_FROM_CENTS)
      ? 0
      : deliveryOptions[delivery].priceCents;
  const totalCents = Math.max(0, afterDiscount + shippingCents);
  const vatCents = Math.round(totalCents - totalCents / (1 + VAT_RATE));
  return { subtotalCents, discountCents, shippingCents, totalCents, vatCents };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Dutch postcodes: four digits not starting with 0, then two letters. SA, SD and SS are not issued. */
const POSTCODE = /^[1-9]\d{3} ?(?!SA|SD|SS)[A-Z]{2}$/;

export const normalizePostcode = (value: string): string => {
  const compact = value.replace(/\s+/g, '').toUpperCase();
  return compact.length === 6 ? `${compact.slice(0, 4)} ${compact.slice(4)}` : value.trim().toUpperCase();
};

export function validateAddress(address: Address): FieldErrors {
  const errors: FieldErrors = {};
  if (!address.fullName.trim()) errors.fullName = 'Enter your full name.';
  if (!address.email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL.test(address.email.trim())) errors.email = 'Enter an email address like name@example.com.';
  if (!address.street.trim()) errors.street = 'Enter your street and house number.';
  else if (!/\d/.test(address.street)) errors.street = 'Add your house number.';
  if (!address.postcode.trim()) errors.postcode = 'Enter your postcode.';
  else if (!POSTCODE.test(normalizePostcode(address.postcode))) errors.postcode = 'Enter a Dutch postcode like 1012 AB.';
  if (!address.city.trim()) errors.city = 'Enter your town or city.';
  return errors;
}

export const digitsOnly = (value: string): string => value.replace(/\D/g, '');

/** Groups card digits in fours as the customer types, capped at 19 digits. */
export const formatCardNumber = (value: string): string =>
  digitsOnly(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');

/** Formats expiry input as MM/YY. */
export function formatExpiry(value: string): string {
  const digits = digitsOnly(value).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export function passesLuhn(cardNumber: string): boolean {
  const digits = digitsOnly(cardNumber);
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** A card is valid through the last day of its expiry month. `today` is an ISO date. */
export function isExpired(expiry: string, today: string): boolean {
  const [month, year] = expiry.split('/').map(Number);
  const [currentYear, currentMonth] = today.split('-').map(Number);
  const fullYear = 2000 + year;
  return fullYear < currentYear || (fullYear === currentYear && month < currentMonth);
}

export function validatePayment(payment: Payment, today: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!payment.cardName.trim()) errors.cardName = 'Enter the name on the card.';
  if (!digitsOnly(payment.cardNumber)) errors.cardNumber = 'Enter your card number.';
  else if (!passesLuhn(payment.cardNumber)) errors.cardNumber = 'Check the card number, it is not valid.';
  if (!payment.expiry) errors.expiry = 'Enter the expiry date.';
  else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(payment.expiry)) errors.expiry = 'Enter the expiry date as MM/YY.';
  else if (isExpired(payment.expiry, today)) errors.expiry = 'This card has expired.';
  if (!/^\d{3,4}$/.test(payment.cvc)) errors.cvc = 'Enter the 3 or 4 digit security code.';
  return errors;
}

/** Shows only the last four digits on the review step. */
export const maskCard = (cardNumber: string): string => `•••• ${digitsOnly(cardNumber).slice(-4)}`;
