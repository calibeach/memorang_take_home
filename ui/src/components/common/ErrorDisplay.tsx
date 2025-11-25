"use client";

import { classNames } from "@/lib/utils";

interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  variant?: "inline" | "card" | "full";
}

/**
 * Consistent error display component
 */
export function ErrorDisplay({
  title = "Error",
  message,
  onRetry,
  className,
  variant = "card",
}: ErrorDisplayProps) {
  const variants = {
    inline: "bg-error-50 border-l-4 border-error-500 p-4",
    card: "bg-white rounded-lg shadow-sm border border-error-200 p-6",
    full: "flex flex-col items-center justify-center min-h-[200px] p-8",
  };

  const iconSize = variant === "full" ? "w-16 h-16" : "w-6 h-6";

  return (
    <div className={classNames(variants[variant], className)}>
      <div
        className={classNames(
          "flex",
          variant === "full" ? "flex-col items-center text-center" : "items-start gap-3"
        )}
      >
        {/* Error Icon */}
        <div
          className={classNames(
            iconSize,
            variant === "full" ? "bg-error-100 rounded-full p-3 mb-4" : "flex-shrink-0",
            variant !== "inline" && "text-error-500"
          )}
        >
          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Content */}
        <div className={variant !== "full" ? "flex-1" : ""}>
          <h3
            className={classNames(
              "font-medium",
              variant === "full" ? "text-xl mb-2" : "text-base",
              variant === "inline" ? "text-error-800" : "text-gray-900"
            )}
          >
            {title}
          </h3>
          <p
            className={classNames(
              "mt-1",
              variant === "inline" ? "text-error-700" : "text-gray-600",
              variant === "full" ? "text-base" : "text-sm"
            )}
          >
            {message}
          </p>

          {/* Retry Button */}
          {onRetry && (
            <button
              onClick={onRetry}
              className={classNames(
                "font-medium transition-colors",
                variant === "full"
                  ? "mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  : "mt-3 text-primary-600 hover:text-primary-700 text-sm"
              )}
            >
              {variant === "full" ? "Try Again" : "Retry"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
