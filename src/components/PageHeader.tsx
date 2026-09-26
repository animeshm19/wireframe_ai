import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  lede?: ReactNode;
  /** One button or link. */
  action?: ReactNode;
};

export function PageHeader({ title, lede, action }: Props) {
  return (
    <header className="max-w-3xl">
      <h1 className="h-display">{title}</h1>
      {lede && <p className="lede mt-5 max-w-2xl">{lede}</p>}
      {action && <div className="mt-8">{action}</div>}
    </header>
  );
}

/** The page frame every inner page uses: base colour, one glow, one gutter. */
export function PageShell({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return (
    <main className="page-glow min-h-screen bg-ink-950 text-white">
      <div className="shell pb-24 pt-32 sm:pt-40">
        {narrow ? <div className="max-w-3xl">{children}</div> : children}
      </div>
    </main>
  );
}

export default PageHeader;
