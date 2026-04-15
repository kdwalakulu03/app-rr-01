import { type ReactNode } from 'react';

// ── Variants ──

const variants = {
  default:  'bg-surface-subtle text-content',
  primary:  'bg-primary-500/15 text-primary-600',
  success:  'bg-green-500/15 text-green-600',
  warning:  'bg-amber-500/15 text-amber-600',
  danger:   'bg-red-500/15 text-red-600',
  info:     'bg-blue-500/15 text-blue-600',
  purple:   'bg-purple-500/15 text-purple-600',
  orange:   'bg-orange-500/15 text-orange-600',
} as const;

const sizes = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1 text-sm',
} as const;

// ── Props ──

export interface BadgeProps {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Makes it a pill shape (rounded-full) instead of rounded */
  pill?: boolean;
}

// ── Component ──

export default function Badge({
  variant = 'default',
  size = 'sm',
  icon,
  children,
  className = '',
  pill = false,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium ${pill ? 'rounded-full' : 'rounded'} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
