"use client";

import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full h-12 rounded-2xl border-2 px-4 text-sm transition-all duration-200 outline-none
            ${error
              ? "border-red-500 focus:ring-4 focus:ring-red-100"
              : "border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            }
            placeholder:text-slate-400 ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className = "", ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        className={`w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm transition-all duration-200 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 placeholder:text-slate-400 resize-none ${className}`}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = "", ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        className={`w-full h-12 rounded-2xl border-2 border-slate-200 px-4 text-sm transition-all duration-200 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 bg-white ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
