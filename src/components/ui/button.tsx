import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
};

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-4xl transition-all active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none";

    const variants = {
      default: "bg-[var(--gold-500)] text-black hover:bg-[var(--gold-400)]",
      ghost: "bg-transparent text-[var(--gold-500)] hover:bg-white/5",
      outline:
        "border border-[color:var(--gold-500)]/40 text-[var(--gold-500)] hover:bg-[color:var(--gold-500)]/10",
    }[variant];

    const sizes = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-5 text-sm",
      lg: "h-12 px-6 text-base",
    }[size];

    return (
      <button
        ref={ref}
        className={cn(base, variants, sizes, className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
