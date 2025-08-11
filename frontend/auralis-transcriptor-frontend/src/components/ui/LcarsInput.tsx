import React from 'react';
import { clsx } from 'clsx';

interface LcarsInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const LcarsInput: React.FC<LcarsInputProps> = ({
  label,
  error,
  helperText,
  className,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-lcars-blue text-sm font-medium uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'lcars-input w-full',
          {
            'border-[var(--lcars-red)]': error,
          },
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-[var(--lcars-red)]">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-2 text-sm text-lcars-grey">{helperText}</p>
      )}
    </div>
  );
};

export default LcarsInput;
