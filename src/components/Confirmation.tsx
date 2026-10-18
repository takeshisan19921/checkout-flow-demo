import { deliveryOptions, formatCents } from '../lib/checkout';
import type { PlacedOrder } from '../lib/payment';
import type { DeliveryOption } from '../lib/types';

interface Props {
  order: PlacedOrder;
  delivery: DeliveryOption;
  onStartOver: () => void;
}

export function Confirmation({ order, delivery, onStartOver }: Props) {
  return (
    <section className="panel stack confirmation" aria-labelledby="step-heading">
      <svg className="check" viewBox="0 0 52 52" aria-hidden="true">
        <circle className="check__circle" cx="26" cy="26" r="24" />
        <path className="check__mark" d="M15 27l7 7 15-15" />
      </svg>
      <h2 id="step-heading" tabIndex={-1}>
        Thank you, {order.firstName}
      </h2>
      <p>
        Order <strong className="mono">{order.orderNumber}</strong> is confirmed and {formatCents(order.totalCents)} has
        been paid.
      </p>
      <p className="muted">
        A confirmation is on its way to {order.email}. Delivery: {deliveryOptions[delivery].detail.toLowerCase()}.
      </p>
      <div>
        <button type="button" className="button" onClick={onStartOver}>
          Start over
        </button>
      </div>
    </section>
  );
}
