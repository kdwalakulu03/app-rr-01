import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

// ── Sizes ──

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-3 rounded-xl',
  lg: 'px-4 py-3.5 rounded-xl text-lg',
} as const;

// ── Props ──

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  inputSize?: keyof typeof sizes;
  icon?: ReactNode;
  required?: boolean;
}

// ── Component ──

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, inputSize = 'md', icon, required, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-content mb-2">
            {label}
            {required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-faint">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full border-2 ${
              error ? 'border-red-400 focus:ring-red-500' : 'border-line focus:ring-primary-500'
            } ${sizes[inputSize]} focus:ring-2 focus:outline-none bg-surface text-content placeholder:text-content-faint ${
              icon ? 'pl-10' : ''
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-content-muted">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
