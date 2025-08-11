import React from 'react';
import { clsx } from 'clsx';

interface LcarsProgressProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  animated?: boolean;
  className?: string;
}

const LcarsProgress: React.FC<LcarsProgressProps> = ({
  value,
  label,
  showPercentage = true,
  animated = false,
  className
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={clsx('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-lcars-blue text-sm uppercase tracking-wider">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-lcars-orange text-sm font-bold">
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}
      <div className="lcars-progress">
        <div
          className={clsx(
            'lcars-progress-fill',
            {
              'animate-pulse': animated && clampedValue > 0 && clampedValue < 100,
            }
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
};

export default LcarsProgress;
