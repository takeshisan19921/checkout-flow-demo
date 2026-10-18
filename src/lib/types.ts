export interface CartLine {
  sku: string;
  name: string;
  variant: string;
  quantity: number;
  /** Price per unit in euro cents, VAT included. */
  unitPriceCents: number;
}

export type DeliveryOption = 'standard' | 'express' | 'pickup';

export interface Address {
  fullName: string;
  email: string;
  street: string;
  postcode: string;
  city: string;
}

export interface Payment {
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}

export interface CheckoutState {
  address: Address;
  delivery: DeliveryOption;
  payment: Payment;
  couponCode: string | null;
}

export type FieldErrors = Partial<Record<string, string>>;
