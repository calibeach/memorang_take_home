"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { classNames } from "@/lib/utils";
import { LoadingSpinner } from "./LoadingSpinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

/**
 * Standardized button component with loading state
 */
export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  loadingText,
  icon,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    "font-medium transition-all duration-200 rounded-lg inline-flex items-center justify-center gap-2";

  const variants = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 disabled:bg-primary-300",
    secondary:
      "bg-gray-200 text-gray-900 border-2 border-gray-300 hover:bg-gray-300 disabled:bg-gray-100",
    outline:
      "border-2 border-gray-300 text-gray-700 hover:border-primary-500 hover:text-primary-600 disabled:border-gray-200",
    ghost: "text-gray-700 hover:bg-gray-100 disabled:text-gray-400",
    danger: "bg-error-600 text-white hover:bg-error-700 disabled:bg-error-300",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      className={classNames(
        baseClasses,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        isDisabled && "cursor-not-allowed opacity-50",
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <>
          <LoadingSpinner
            size={size === "sm" ? "sm" : "md"}
            color={variant === "primary" || variant === "danger" ? "white" : "gray"}
          />
          {loadingText || children}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}
