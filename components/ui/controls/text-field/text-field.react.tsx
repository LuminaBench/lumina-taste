import { useId, type InputHTMLAttributes } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './text-field';
import './text-field.css';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'> { label: string; help?: string }

/** Floating-label field. Wrap one or more in <ValidatedForm> for inline validation. */
export function TextField({ label, help = '', className, id, ...input }: TextFieldProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={cx('lt-field', className)}>
      <input id={fid} placeholder=" " aria-describedby={`${fid}m`} {...input} />
      <label htmlFor={fid}>{label}</label>
      <span data-part="valid" aria-hidden="true"><Icon name="check" /></span>
      <p id={`${fid}m`} data-part="message" data-help={help}>{help}</p>
    </div>
  );
}

export function ValidatedForm({ children, onValidSubmit, className }: { children: React.ReactNode; onValidSubmit?: () => void; className?: string }) {
  const ref = useEnhance<HTMLFormElement, { valid: boolean }>(enhance, (d) => d.valid && onValidSubmit?.());
  return <form ref={ref} className={cx('lt-form-demo', className)} noValidate>{children}</form>;
}
