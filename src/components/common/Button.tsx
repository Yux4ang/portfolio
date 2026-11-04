/**
 * 通用按钮组件，统一管理按钮的几种视觉变体。
 * 想新增一种按钮风格（比如"危险按钮"），在 VARIANT_CLASSES 里加一项即可。
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 hover:bg-brand-600 text-white',
  secondary: 'bg-surface-secondary hover:bg-brand-50 text-brand-600 border border-surface-border',
  ghost: 'bg-transparent hover:bg-surface-secondary text-text-secondary',
  danger: 'bg-loss/10 hover:bg-loss/20 text-loss border border-loss/30',
};

export function Button({ children, variant = 'primary', className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`ui-button ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
