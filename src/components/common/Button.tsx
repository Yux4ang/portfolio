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
  primary: 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20',
  secondary: 'bg-white/10 hover:bg-white/15 text-text-primary border border-surface-border',
  ghost: 'bg-transparent hover:bg-white/5 text-text-secondary',
  danger: 'bg-loss/10 hover:bg-loss/20 text-loss border border-loss/30',
};

export function Button({ children, variant = 'primary', className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded-app-sm font-medium text-sm transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
