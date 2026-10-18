export interface StepInfo {
  id: string;
  label: string;
}

interface Props {
  steps: readonly StepInfo[];
  current: number;
  onSelect: (index: number) => void;
}

/** Earlier steps are buttons so the customer can go back; later steps can only be reached by continuing. */
export function Stepper({ steps, current, onSelect }: Props) {
  return (
    <nav aria-label="Checkout progress">
      <ol className="stepper">
        {steps.map((step, index) => {
          const state = index < current ? 'done' : index === current ? 'current' : 'todo';
          const marker = (
            <span className="stepper__marker" aria-hidden="true">
              {state === 'done' ? '✓' : index + 1}
            </span>
          );
          return (
            <li key={step.id} className={`stepper__item stepper__item--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              {state === 'done' ? (
                <button type="button" className="stepper__button" aria-label={`Go back to ${step.label}`} onClick={() => onSelect(index)}>
                  {marker}
                  <span>{step.label}</span>
                </button>
              ) : (
                <span className="stepper__button">
                  {marker}
                  <span>{step.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
