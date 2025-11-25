"use client";

import { classNames } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
  color?: "primary" | "white" | "gray";
}

/**
 * Reusable loading spinner component
 */
export function LoadingSpinner({
  size = "md",
  text,
  className,
  color = "primary",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-8 h-8",
  };

  const colorClasses = {
    primary: "border-primary-500 border-t-transparent",
    white: "border-white border-t-transparent",
    gray: "border-gray-400 border-t-gray-200",
  };

  return (
    <div className={classNames("flex items-center gap-2", className)}>
      <div
        className={classNames(
          sizeClasses[size],
          "border-2 rounded-full animate-spin",
          colorClasses[color]
        )}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
      {text && <span className="text-sm">{text}</span>}
    </div>
  );
}
