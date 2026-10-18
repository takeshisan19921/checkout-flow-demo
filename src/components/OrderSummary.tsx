import { useState, type FormEvent } from 'react';
import { applyCoupon, formatCents, FREE_SHIPPING_FROM_CENTS, type Totals } from '../lib/checkout';
import type { CartLine, DeliveryOption } from '../lib/types';

interface Props {
  lines: readonly CartLine[];
  totals: Totals;
  delivery: DeliveryOption;
  couponCode: string | null;
  locked: boolean;
  onApplyCoupon: (code: string) => void;
  onRemoveCoupon: () => void;
}

const swatches = ['#d9c3a5', '#c9d6c3', '#b9c7d8', '#e3c7c0'];

export function OrderSummary({ lines, totals, delivery, couponCode, locked, onApplyCoupon, onRemoveCoupon }: Props) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = applyCoupon(code, totals.subtotalCents);
    if (result.ok) {
      onApplyCoupon(result.code);
      setCode('');
      setMessage({ tone: 'ok', text: `${result.code} applied: ${result.label}.` });
    } else {
      setMessage({ tone: 'error', text: result.message });
    }
  };

  const remove = () => {
    onRemoveCoupon();
    setMessage({ tone: 'ok', text: 'Discount code removed.' });
  };

  const afterDiscount = totals.subtotalCents - totals.discountCents;
  const showFreeShipping = delivery !== 'express' && lines.length > 0;
  const progress = Math.min(1, afterDiscount / FREE_SHIPPING_FROM_CENTS);

  return (
    <aside className="panel summary" aria-labelledby="summary-heading">
      <h2 id="summary-heading">Order summary</h2>

      <ul className="lines">
        {lines.map((line, index) => (
          <li key={line.sku} className="line">
            <span className="line__thumb" style={{ background: swatches[index % swatches.length] }} aria-hidden="true">
              {line.name[0]}
            </span>
            <span className="line__text">
              <span className="line__name">{line.name}</span>
              <span className="muted">
                {line.variant} · {line.quantity} × {formatCents(line.unitPriceCents)}
              </span>
            </span>
            <span className="line__price">{formatCents(line.unitPriceCents * line.quantity)}</span>
          </li>
        ))}
      </ul>

      {showFreeShipping && (
        <div className="free-shipping">
          <p>
            {progress >= 1
              ? 'Free standard shipping unlocked.'
              : `Add ${formatCents(FREE_SHIPPING_FROM_CENTS - afterDiscount)} more for free standard shipping.`}
          </p>
          <div className="meter" aria-hidden="true">
            <div className="meter__fill" style={{ transform: `scaleX(${progress})` }} />
          </div>
        </div>
      )}

      {!locked && (
        <form className="coupon" onSubmit={submit} noValidate>
          {couponCode ? (
            <p className="coupon__applied">
              <span className="chip">{couponCode}</span>
              <button type="button" className="link" aria-label={`Remove discount code ${couponCode}`} onClick={remove}>
                Remove
              </button>
            </p>
          ) : (
            <div className="coupon__row">
              <label htmlFor="coupon">Discount code</label>
              <input id="coupon" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
              <button type="submit" className="button">
                Apply
              </button>
            </div>
          )}
          <p className={`coupon__message${message ? ` coupon__message--${message.tone}` : ''}`} role="status">
            {message?.text}
          </p>
        </form>
      )}

      <dl className="totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatCents(totals.subtotalCents)}</dd>
        </div>
        {totals.discountCents > 0 && (
          <div className="totals__discount">
            <dt>Discount</dt>
            <dd>− {formatCents(totals.discountCents)}</dd>
          </div>
        )}
        <div>
          <dt>Shipping</dt>
          <dd>{totals.shippingCents === 0 ? 'Free' : formatCents(totals.shippingCents)}</dd>
        </div>
        <div className="totals__total">
          <dt>Total</dt>
          {/* The key restarts the highlight animation whenever the total changes. */}
          <dd key={totals.totalCents} className="pulse">
            {formatCents(totals.totalCents)}
          </dd>
        </div>
      </dl>
      <p className="muted small">Including {formatCents(totals.vatCents)} VAT</p>
    </aside>
  );
}
