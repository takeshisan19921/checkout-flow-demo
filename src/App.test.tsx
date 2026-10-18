import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';
import { createFakeProcessor } from './lib/payment';

type User = ReturnType<typeof userEvent.setup>;

const setup = () => {
  const user = userEvent.setup();
  render(<App today="2026-10-18" processor={createFakeProcessor({ delayMs: 0 })} />);
  return user;
};

const fillShipping = async (user: User) => {
  await user.type(screen.getByLabelText('Full name'), 'Sanne de Vries');
  await user.type(screen.getByLabelText('Email address'), 'sanne@example.com');
  await user.type(screen.getByLabelText('Street and house number'), 'Keizersgracht 12');
  await user.type(screen.getByLabelText('Postcode'), '1015cs');
  await user.type(screen.getByLabelText('Town or city'), 'Amsterdam');
};

const fillPayment = async (user: User, card = '4242424242424242') => {
  await user.type(screen.getByLabelText('Name on card'), 'S de Vries');
  await user.type(screen.getByLabelText('Card number'), card);
  await user.type(screen.getByLabelText('Expiry date'), '1228');
  await user.type(screen.getByLabelText('Security code'), '123');
};

const toReview = async (user: User, card?: string) => {
  await fillShipping(user);
  await user.click(screen.getByRole('button', { name: 'Continue to payment' }));
  await fillPayment(user, card);
  await user.click(screen.getByRole('button', { name: 'Review order' }));
};

describe('Checkout', () => {
  it('focuses the first invalid field and clears its error once fixed', async () => {
    const user = setup();
    await user.type(screen.getByLabelText('Full name'), 'Sanne de Vries');
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));

    const email = screen.getByLabelText('Email address');
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription(/Enter your email address\./);

    await user.type(email, 'sanne@example.com');
    expect(email).not.toHaveAttribute('aria-invalid');
  });

  it('normalizes the postcode when the customer leaves the field', async () => {
    const user = setup();
    await fillShipping(user);
    expect(screen.getByLabelText('Postcode')).toHaveValue('1015 CS');
  });

  it('completes an express order and shows the confirmation', async () => {
    const user = setup();
    await fillShipping(user);
    await user.click(screen.getByRole('radio', { name: /Express/ }));
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));
    expect(screen.getByRole('heading', { name: 'Payment' })).toHaveFocus();

    await fillPayment(user);
    expect(screen.getByLabelText('Card number')).toHaveValue('4242 4242 4242 4242');
    expect(screen.getByLabelText('Expiry date')).toHaveValue('12/28');
    await user.click(screen.getByRole('button', { name: 'Review order' }));

    expect(screen.getByRole('heading', { name: 'Review your order' })).toHaveFocus();
    expect(screen.getByText('•••• 4242')).toBeInTheDocument();
    const progress = screen.getByRole('navigation', { name: 'Checkout progress' });
    expect(within(progress).getByText('Review').closest('li')).toHaveAttribute('aria-current', 'step');

    // € 167,95 of items plus € 9,95 express shipping.
    await user.click(screen.getByRole('button', { name: /^Pay .*177,90$/ }));
    expect(await screen.findByRole('heading', { name: 'Thank you, Sanne' })).toHaveFocus();
    expect(screen.getByText('NL-58231')).toBeInTheDocument();
  });

  it('keeps entered details when going back', async () => {
    const user = setup();
    await fillShipping(user);
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));
    await user.click(screen.getByRole('button', { name: 'Go back to Shipping' }));
    expect(screen.getByLabelText('Full name')).toHaveValue('Sanne de Vries');
    expect(screen.getByLabelText('Town or city')).toHaveValue('Amsterdam');
  });

  it('applies, rejects and removes discount codes', async () => {
    const user = setup();
    const summary = screen.getByRole('complementary', { name: 'Order summary' });
    const code = within(summary).getByLabelText('Discount code');

    await user.type(code, 'FREE');
    await user.click(within(summary).getByRole('button', { name: 'Apply' }));
    expect(within(summary).getByRole('status')).toHaveTextContent('FREE is not a valid code.');

    await user.clear(code);
    await user.type(code, 'welcome10');
    await user.click(within(summary).getByRole('button', { name: 'Apply' }));
    expect(within(summary).getByRole('status')).toHaveTextContent('WELCOME10 applied');
    expect(within(summary).getByText('Discount').nextElementSibling).toHaveTextContent(/16,80/);
    expect(within(summary).getByText('Total').nextElementSibling).toHaveTextContent(/151,15/);

    await user.click(within(summary).getByRole('button', { name: 'Remove discount code WELCOME10' }));
    expect(within(summary).queryByText('Discount')).not.toBeInTheDocument();
  });

  it('shows a declined payment on the review step and keeps the card for editing', async () => {
    const user = setup();
    await toReview(user, '4000000000000002');
    await user.click(screen.getByRole('button', { name: /^Pay / }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Your bank declined the payment.');
    expect(screen.getByRole('heading', { name: 'Review your order' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit payment' }));
    expect(screen.getByLabelText('Card number')).toHaveValue('4000 0000 0000 0002');
  });
});
