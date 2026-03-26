interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className = "bg-slate-100 text-slate-700 border-slate-200" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}
