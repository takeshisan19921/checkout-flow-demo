import { deliveryOptions, formatCents, maskCard, type Totals } from '../lib/checkout';
import type { Address, DeliveryOption, Payment } from '../lib/types';

interface Props {
  address: Address;
  delivery: DeliveryOption;
  payment: Payment;
  totals: Totals;
  placing: boolean;
  error: string;
  onEditShipping: () => void;
  onEditPayment: () => void;
  onBack: () => void;
  onPlaceOrder: () => void;
}

export function ReviewStep({ address, delivery, payment, totals, placing, error, onEditShipping, onEditPayment, onBack, onPlaceOrder }: Props) {
  const option = deliveryOptions[delivery];
  return (
    <section className="panel stack" aria-labelledby="step-heading">
      <h2 id="step-heading" tabIndex={-1}>
        Review your order
      </h2>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <dl className="review">
        <div className="review__row">
          <dt>Ship to</dt>
          <dd>
            {address.fullName}
            <br />
            {address.street}
            <br />
            {address.postcode} {address.city}
            <br />
            <span className="muted">{address.email}</span>
          </dd>
          <button type="button" className="link" aria-label="Edit shipping address" onClick={onEditShipping} disabled={placing}>
            Edit
          </button>
        </div>
        <div className="review__row">
          <dt>Delivery</dt>
          <dd>
            {option.label}, {option.detail.toLowerCase()}
          </dd>
          <button type="button" className="link" aria-label="Edit delivery" onClick={onEditShipping} disabled={placing}>
            Edit
          </button>
        </div>
        <div className="review__row">
          <dt>Payment</dt>
          <dd>
            Card <span className="mono">{maskCard(payment.cardNumber)}</span>, expires {payment.expiry}
          </dd>
          <button type="button" className="link" aria-label="Edit payment" onClick={onEditPayment} disabled={placing}>
            Edit
          </button>
        </div>
      </dl>

      <div className="actions">
        <button type="button" className="button" onClick={onBack} disabled={placing}>
          Back
        </button>
        <button type="button" className="button button--primary button--pay" onClick={onPlaceOrder} aria-busy={placing}>
          {placing ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Processing payment…
            </>
          ) : (
            `Pay ${formatCents(totals.totalCents)}`
          )}
        </button>
      </div>
    </section>
  );
}
