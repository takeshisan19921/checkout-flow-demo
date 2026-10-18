import { useState, type ChangeEvent, type FormEvent } from 'react';
import { digitsOnly, formatCardNumber, formatExpiry, validatePayment } from '../lib/checkout';
import type { FieldErrors, Payment } from '../lib/types';
import { TextField } from './TextField';

interface Props {
  payment: Payment;
  today: string;
  onChange: (payment: Payment) => void;
  onBack: () => void;
  onContinue: () => void;
}

const fieldOrder: (keyof Payment)[] = ['cardName', 'cardNumber', 'expiry', 'cvc'];
const keepAsTyped = (value: string) => value;
const formatCvc = (value: string) => digitsOnly(value).slice(0, 4);

export function PaymentStep({ payment, today, onChange, onBack, onContinue }: Props) {
  const [errors, setErrors] = useState<FieldErrors>({});

  const change = (key: keyof Payment, format: (value: string) => string) => (event: ChangeEvent<HTMLInputElement>) => {
    const next = { ...payment, [key]: format(event.target.value) };
    onChange(next);
    if (errors[key]) setErrors((current) => ({ ...current, [key]: validatePayment(next, today)[key] }));
  };

  const blur = (key: keyof Payment) => () => {
    if (!payment[key].trim()) return;
    setErrors((current) => ({ ...current, [key]: validatePayment(payment, today)[key] }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validatePayment(payment, today);
    setErrors(found);
    const firstInvalid = fieldOrder.find((key) => found[key]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    onContinue();
  };

  const field = (key: keyof Payment, format: (value: string) => string = keepAsTyped) => ({
    id: key,
    value: payment[key],
    error: errors[key],
    onChange: change(key, format),
    onBlur: blur(key),
  });

  return (
    <form className="panel stack" onSubmit={submit} noValidate aria-labelledby="step-heading">
      <h2 id="step-heading" tabIndex={-1}>
        Payment
      </h2>
      <p className="demo-note">
        Demo only, nothing is charged. Use <code>4242 4242 4242 4242</code> with any future date.{' '}
        <code>4000 0000 0000 0002</code> is always declined.
      </p>
      <TextField {...field('cardName')} label="Name on card" autoComplete="cc-name" />
      <TextField
        {...field('cardNumber', formatCardNumber)}
        label="Card number"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="1234 5678 9012 3456"
      />
      <div className="row">
        <TextField
          {...field('expiry', formatExpiry)}
          label="Expiry date"
          hint="MM/YY"
          inputMode="numeric"
          autoComplete="cc-exp"
        />
        <TextField
          {...field('cvc', formatCvc)}
          label="Security code"
          hint="3 or 4 digits on the back"
          inputMode="numeric"
          autoComplete="cc-csc"
        />
      </div>
      <div className="actions">
        <button type="button" className="button" onClick={onBack}>
          Back
        </button>
        <button type="submit" className="button button--primary">
          Review order
        </button>
      </div>
    </form>
  );
}
