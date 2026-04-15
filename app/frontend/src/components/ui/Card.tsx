import { type HTMLAttributes, type ReactNode, forwardRef } from 'react';

// ── Variants ──

const baseCard = 'bg-surface-card rounded-2xl';

const variants = {
  default: 'shadow-sm',
  elevated: 'shadow-lg',
  outline: 'border border-line shadow-sm',
  glass: 'bg-surface-card/90 backdrop-blur-sm border border-line shadow-xl',
} as const;

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-6 md:p-8',
} as const;

// ── Props ──

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variants;
  padding?: keyof typeof paddings;
}

// ── Component ──

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${baseCard} ${variants[variant]} ${paddings[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
export default Card;

// ── Sub-components ──

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-lg font-semibold text-content-heading ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-content-muted mt-1 ${className}`}>{children}</p>;
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mt-6 pt-4 border-t border-line flex items-center justify-between ${className}`}>{children}</div>;
}
