import { digitsOnly, type Totals } from './checkout';
import type { CheckoutState } from './types';

/** Same convention as Stripe's test cards: this number is always declined. */
export const DECLINED_TEST_CARD = '4000000000000002';

export interface PlacedOrder {
  orderNumber: string;
  email: string;
  firstName: string;
  totalCents: number;
}

export interface PaymentProcessor {
  placeOrder(checkout: CheckoutState, totals: Totals): Promise<PlacedOrder>;
}

export class PaymentDeclinedError extends Error {
  constructor() {
    super('Your bank declined the payment. No money was taken. Try another card.');
    this.name = 'PaymentDeclinedError';
  }
}

/** Stands in for a payment provider. Nothing is charged; the delay makes the loading state visible. */
export function createFakeProcessor({ delayMs = 1200, firstOrderNumber = 58231 } = {}): PaymentProcessor {
  let next = firstOrderNumber;
  return {
    async placeOrder(checkout, totals) {
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      if (digitsOnly(checkout.payment.cardNumber) === DECLINED_TEST_CARD) throw new PaymentDeclinedError();
      return {
        orderNumber: `NL-${next++}`,
        email: checkout.address.email.trim(),
        firstName: checkout.address.fullName.trim().split(/\s+/)[0],
        totalCents: totals.totalCents,
      };
    },
  };
}
