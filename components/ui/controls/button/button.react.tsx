import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import { cx } from '../../_shared/react';
import './button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  /** 'danger' with variant="primary" is the filled confirm button of a destructive action. */
  tone?: 'danger';
  icon?: IconName;
  /** Icon-only buttons must pass aria-label. */
  iconOnly?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({ variant = 'secondary', size = 'md', tone, icon, iconOnly, loading, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx('lt-btn', className)}
      data-variant={variant}
      data-size={size === 'md' ? undefined : size}
      data-tone={tone}
      data-icon-only={iconOnly || undefined}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {!iconOnly && children != null && <span data-part="label">{children}</span>}
    </button>
  );
}
