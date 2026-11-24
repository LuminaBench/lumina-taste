import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './stepper-wizard';
import '../../controls/button/button.css';
import './stepper-wizard.css';

export function StepperWizard({ steps, initialStep = 1, onStepChange, className }: { steps: string[]; initialStep?: number; onStepChange?: (step: number) => void; className?: string }) {
  const ref = useEnhance<HTMLDivElement, { step: number }>(enhance, (d) => onStepChange?.(d.step));
  return (
    <div ref={ref} className={cx('lt-wizard', className)} data-step={initialStep}>
      <ol data-part="steps" aria-label="Progress">
        {steps.map((s, i) => (
          <li data-part="step" key={s}><span data-part="dot"><span data-part="num">{i + 1}</span><Icon name="check" size={14} /></span><span data-part="name">{s}</span></li>
        ))}
      </ol>
      <p data-part="status" aria-live="polite" />
      <div data-part="actions">
        <button type="button" className="lt-btn" data-variant="ghost" data-part="back"><span data-part="label">Back</span></button>
        <button type="button" className="lt-btn" data-variant="primary" data-part="next"><span data-part="label">Continue</span></button>
      </div>
    </div>
  );
}
