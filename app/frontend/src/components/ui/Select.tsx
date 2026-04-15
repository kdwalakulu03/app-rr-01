import { forwardRef, type SelectHTMLAttributes } from 'react';

// ── Sizes ──

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-3 rounded-xl',
  lg: 'px-4 py-3.5 rounded-xl text-lg',
} as const;

// ── Props ──

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  selectSize?: keyof typeof sizes;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}

// ── Component ──

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, selectSize = 'md', options, placeholder, required, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-content mb-2">
            {label}
            {required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full border-2 ${
            error ? 'border-red-400 focus:ring-red-500' : 'border-line focus:ring-primary-500'
          } ${sizes[selectSize]} focus:ring-2 focus:outline-none bg-surface text-content ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-content-muted">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
