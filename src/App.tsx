import { useEffect, useMemo, useRef, useState } from 'react';
import { Confirmation } from './components/Confirmation';
import { OrderSummary } from './components/OrderSummary';
import { PaymentStep } from './components/PaymentStep';
import { ReviewStep } from './components/ReviewStep';
import { ShippingStep } from './components/ShippingStep';
import { Stepper, type StepInfo } from './components/Stepper';
import { calculateTotals } from './lib/checkout';
import { createFakeProcessor, type PaymentProcessor, type PlacedOrder } from './lib/payment';
import { DEMO_TODAY, sampleCart } from './lib/sampleCart';
import type { Address, CartLine, DeliveryOption, Payment } from './lib/types';

const steps: readonly StepInfo[] = [
  { id: 'shipping', label: 'Shipping' },
  { id: 'payment', label: 'Payment' },
  { id: 'review', label: 'Review' },
];

const emptyAddress: Address = { fullName: '', email: '', street: '', postcode: '', city: '' };
const emptyPayment: Payment = { cardName: '', cardNumber: '', expiry: '', cvc: '' };

interface Props {
  cart?: readonly CartLine[];
  today?: string;
  processor?: PaymentProcessor;
}

export default function App({ cart = sampleCart, today = DEMO_TODAY, processor }: Props) {
  const pay = useMemo(() => processor ?? createFakeProcessor(), [processor]);
  const [stepIndex, setStepIndex] = useState(0);
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [delivery, setDelivery] = useState<DeliveryOption>('standard');
  const [payment, setPayment] = useState<Payment>(emptyPayment);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  // A ref, not state, so a fast double click can't start two payments before React re-renders.
  const placingRef = useRef(false);

  const totals = useMemo(() => calculateTotals(cart, delivery, couponCode), [cart, delivery, couponCode]);

  // Move focus to the new step's heading so screen reader and keyboard users
  // start at the top of the step. Skipped on first load.
  const view = order ? 'done' : steps[stepIndex].id;
  const shownView = useRef(view);
  useEffect(() => {
    if (shownView.current === view) return;
    shownView.current = view;
    document.getElementById('step-heading')?.focus();
  }, [view]);

  const goTo = (index: number) => {
    setPaymentError('');
    setStepIndex(index);
  };

  const placeOrder = async () => {
    if (placingRef.current) return;
    placingRef.current = true;
    setPlacing(true);
    setPaymentError('');
    try {
      setOrder(await pay.placeOrder({ address, delivery, payment, couponCode }, totals));
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'The payment failed. Please try again.');
    } finally {
      placingRef.current = false;
      setPlacing(false);
    }
  };

  const startOver = () => {
    setAddress(emptyAddress);
    setPayment(emptyPayment);
    setDelivery('standard');
    setCouponCode(null);
    setOrder(null);
    setStepIndex(0);
  };

  return (
    <div className="layout">
      <header className="topbar">
        <span className="brand">Studio Noord</span>
        <span className="secure">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 7V5a4 4 0 1 1 8 0v2h1v8H3V7h1zm2 0h4V5a2 2 0 1 0-4 0v2z" />
          </svg>
          Secure checkout (demo)
        </span>
      </header>
      <main className="columns">
        <div className="main-col">
          {order ? (
            <div className="step" key="done">
              <Confirmation order={order} delivery={delivery} onStartOver={startOver} />
            </div>
          ) : (
            <>
              <Stepper steps={steps} current={stepIndex} onSelect={goTo} />
              <div className="step" key={stepIndex}>
                {stepIndex === 0 && (
                  <ShippingStep
                    address={address}
                    delivery={delivery}
                    lines={cart}
                    couponCode={couponCode}
                    onAddressChange={setAddress}
                    onDeliveryChange={setDelivery}
                    onContinue={() => goTo(1)}
                  />
                )}
                {stepIndex === 1 && (
                  <PaymentStep payment={payment} today={today} onChange={setPayment} onBack={() => goTo(0)} onContinue={() => goTo(2)} />
                )}
                {stepIndex === 2 && (
                  <ReviewStep
                    address={address}
                    delivery={delivery}
                    payment={payment}
                    totals={totals}
                    placing={placing}
                    error={paymentError}
                    onEditShipping={() => goTo(0)}
                    onEditPayment={() => goTo(1)}
                    onBack={() => goTo(1)}
                    onPlaceOrder={placeOrder}
                  />
                )}
              </div>
            </>
          )}
        </div>
        <OrderSummary
          lines={cart}
          totals={totals}
          delivery={delivery}
          couponCode={couponCode}
          locked={order !== null || placing}
          onApplyCoupon={setCouponCode}
          onRemoveCoupon={() => setCouponCode(null)}
        />
      </main>
    </div>
  );
}
