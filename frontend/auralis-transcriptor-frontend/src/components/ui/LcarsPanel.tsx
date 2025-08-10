import React from 'react';
import { clsx } from 'clsx';

interface LcarsPanelProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  variant?: 'default' | 'highlight' | 'warning' | 'danger';
}

const LcarsPanel: React.FC<LcarsPanelProps> = ({
  children,
  title,
  subtitle,
  className,
  variant = 'default'
}) => {
  const variantClasses = {
    default: 'border-l-[var(--lcars-orange)]',
    highlight: 'border-l-[var(--lcars-blue)]',
    warning: 'border-l-[var(--lcars-orange)]',
    danger: 'border-l-[var(--lcars-red)]'
  };

  return (
    <div className={clsx('lcars-panel', variantClasses[variant], className)}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-2xl font-bold text-lcars-orange mb-2">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-lcars-blue text-sm uppercase tracking-wider">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default LcarsPanel;
