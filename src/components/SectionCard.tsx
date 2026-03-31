import type { PropsWithChildren, ReactNode } from "react";

interface SectionCardProps extends PropsWithChildren {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export function SectionCard({ title, eyebrow, actions, children }: SectionCardProps) {
  return (
    <section className="rounded-[28px] border border-white/15 bg-slate-950/55 p-5 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.65)] backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          {eyebrow ? <div className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300/70">{eyebrow}</div> : null}
          <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
