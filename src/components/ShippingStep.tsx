import { useState, type ChangeEvent, type FormEvent } from 'react';
import { calculateTotals, deliveryOptions, formatCents, normalizePostcode, validateAddress } from '../lib/checkout';
import type { Address, CartLine, DeliveryOption, FieldErrors } from '../lib/types';
import { TextField } from './TextField';

interface Props {
  address: Address;
  delivery: DeliveryOption;
  lines: readonly CartLine[];
  couponCode: string | null;
  onAddressChange: (address: Address) => void;
  onDeliveryChange: (delivery: DeliveryOption) => void;
  onContinue: () => void;
}

const fieldOrder: (keyof Address)[] = ['fullName', 'email', 'street', 'postcode', 'city'];
const optionIds = Object.keys(deliveryOptions) as DeliveryOption[];

export function ShippingStep({ address, delivery, lines, couponCode, onAddressChange, onDeliveryChange, onContinue }: Props) {
  const [errors, setErrors] = useState<FieldErrors>({});

  // Once a field shows an error, re-check it on every keystroke so the message
  // disappears as soon as the value is fixed.
  const change = (key: keyof Address) => (event: ChangeEvent<HTMLInputElement>) => {
    const next = { ...address, [key]: event.target.value };
    onAddressChange(next);
    if (errors[key]) setErrors((current) => ({ ...current, [key]: validateAddress(next)[key] }));
  };

  // Check a field when the customer leaves it, but never complain about a field they haven't touched yet.
  const blur = (key: keyof Address) => () => {
    if (!address[key].trim()) return;
    const next = key === 'postcode' ? { ...address, postcode: normalizePostcode(address.postcode) } : address;
    if (next !== address) onAddressChange(next);
    setErrors((current) => ({ ...current, [key]: validateAddress(next)[key] }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateAddress(address);
    setErrors(found);
    const firstInvalid = fieldOrder.find((key) => found[key]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    onContinue();
  };

  const field = (key: keyof Address) => ({
    id: key,
    value: address[key],
    error: errors[key],
    onChange: change(key),
    onBlur: blur(key),
  });

  return (
    <form className="panel stack" onSubmit={submit} noValidate aria-labelledby="step-heading">
      <h2 id="step-heading" tabIndex={-1}>
        Shipping
      </h2>
      <TextField {...field('fullName')} label="Full name" autoComplete="name" />
      <TextField
        {...field('email')}
        label="Email address"
        type="email"
        autoComplete="email"
        hint="We'll send the order confirmation here."
      />
      <TextField {...field('street')} label="Street and house number" autoComplete="street-address" />
      <div className="row">
        <TextField {...field('postcode')} label="Postcode" autoComplete="postal-code" className="field--short" />
        <TextField {...field('city')} label="Town or city" autoComplete="address-level2" />
      </div>

      <fieldset className="options">
        <legend>Delivery</legend>
        {optionIds.map((option) => {
          const { label, detail } = deliveryOptions[option];
          const price = calculateTotals(lines, option, couponCode).shippingCents;
          return (
            <label key={option} className="option">
              <input
                type="radio"
                name="delivery"
                value={option}
                checked={delivery === option}
                onChange={() => onDeliveryChange(option)}
              />
              <span className="option__text">
                <span className="option__label">{label}</span>
                <span className="muted">{detail}</span>
              </span>
              <span className="option__price">{price === 0 ? 'Free' : formatCents(price)}</span>
            </label>
          );
        })}
      </fieldset>

      <div className="actions actions--end">
        <button type="submit" className="button button--primary">
          Continue to payment
        </button>
      </div>
    </form>
  );
}
