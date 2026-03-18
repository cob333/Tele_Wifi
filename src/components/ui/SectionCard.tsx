import type { PropsWithChildren, ReactNode } from "react";

interface SectionCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  subtitle,
  actions,
  className,
  children,
}: SectionCardProps) {
  return (
    <section className={`section-card ${className ?? ""}`.trim()}>
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="section-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
