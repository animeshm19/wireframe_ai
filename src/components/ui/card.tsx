import React from "react";

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

type DivProps = React.HTMLAttributes<HTMLDivElement>;
type HProps = React.HTMLAttributes<HTMLHeadingElement>;

export function Card({ className, ...props }: DivProps) {
  return <div className={cn("glass p-6 rounded-3xl", className)} {...props} />;
}

export function CardHeader({ className, ...props }: DivProps) {
  return <div className={cn("mb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HProps) {
  return (
    <h3
      className={cn("text-lg font-semibold text-[var(--gold-500)]", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: DivProps) {
  return (
    <div className={cn("text-sm text-white/80 leading-relaxed", className)} {...props} />
  );
}
