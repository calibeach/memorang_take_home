"use client";

import { classNames } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "success" | "warning" | "error";
  className?: string;
}

/**
 * Reusable progress bar component
 */
export function ProgressBar({
  value,
  max,
  label,
  showPercentage = false,
  size = "md",
  color = "primary",
  className,
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  const colorClasses = {
    primary: "bg-primary-500",
    success: "bg-success-500",
    warning: "bg-yellow-500",
    error: "bg-error-500",
  };

  return (
    <div className={className}>
      {/* Label and percentage */}
      {(label || showPercentage) && (
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          {label && <span>{label}</span>}
          {showPercentage && <span>{percentage}%</span>}
        </div>
      )}

      {/* Progress bar */}
      <div
        className={classNames("bg-gray-200 rounded-full overflow-hidden", sizeClasses[size])}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={classNames("h-full transition-all duration-300 ease-out", colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
