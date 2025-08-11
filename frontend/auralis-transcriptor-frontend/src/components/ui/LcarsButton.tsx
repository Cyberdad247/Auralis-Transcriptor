import React from 'react';
import { clsx } from 'clsx';

interface LcarsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const LcarsButton: React.FC<LcarsButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = 'lcars-button';
  
  const variantClasses = {
    primary: 'bg-[var(--lcars-orange)] text-[var(--lcars-primary-black)]',
    secondary: 'bg-[var(--lcars-blue)] text-[var(--lcars-primary-black)]',
    danger: 'bg-[var(--lcars-red)] text-[var(--lcars-white)]'
  };
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        {
          'opacity-50 cursor-not-allowed': disabled || loading,
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          Processing...
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default LcarsButton;
