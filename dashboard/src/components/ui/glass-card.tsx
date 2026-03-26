import { forwardRef, type HTMLAttributes } from "react";

const paddings = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: keyof typeof paddings;
  hover?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ padding = "md", hover = false, className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${hover ? "glass-panel-hover cursor-pointer" : "glass-panel"} ${paddings[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlassCard.displayName = "GlassCard";
