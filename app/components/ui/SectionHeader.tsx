import type { ReactNode } from "react";

type SectionHeaderProps = {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  align?: "left" | "right";
  as?: "h1" | "h2" | "h3";
};

export default function SectionHeader({
  kicker,
  title,
  description,
  actions,
  align = "left",
  as = "h2",
}: SectionHeaderProps) {
  const TitleTag = as;

  return (
    <header className={`section-header ${align === "right" ? "text-right" : "text-left"}`}>
      <div className="section-header-copy">
        {kicker ? <p className="app-kicker">{kicker}</p> : null}
        <TitleTag className="section-header-title">{title}</TitleTag>
        {description ? <p className="section-header-description">{description}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
