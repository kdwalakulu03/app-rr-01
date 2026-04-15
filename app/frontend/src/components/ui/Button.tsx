import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

// ── Variants ──

const base =
  'inline-flex items-center justify-center gap-2 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2';

const variants = {
  primary:
    'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/30',
  secondary:
    'bg-surface-subtle text-content hover:bg-surface-hover border border-line',
  ghost:
    'text-content-muted hover:bg-surface-hover hover:text-content',
  danger:
    'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30',
  outline:
    'border-2 border-primary-500 text-primary-600 hover:bg-primary-500/10',
} as const;

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-lg',
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 rounded-xl text-sm',
  lg: 'px-6 py-3 rounded-xl',
  xl: 'px-8 py-3 rounded-xl font-semibold',
} as const;

// ── Props ──

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  icon?: ReactNode;
}

// ── Component ──

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
