// client/src/components/ui/TableCard.tsx
import React from "react";

type Align = "left" | "center" | "right";

function alignCls(a: Align) {
  if (a === "left") return "text-left";
  if (a === "right") return "text-right";
  return "text-center";
}

/**
 * TableCard
 * - One consistent shell for all tables (Season / Players / Team)
 * - Exports small primitives so you stop re-inventing <th>/<td> styling per page.
 */
export function TableCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "overflow-hidden rounded-3xl liquid-glass transition-all duration-300",
        className ?? "",
      ].join(" ")}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Table({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <table className={["min-w-full text-sm", className ?? ""].join(" ")}>{children}</table>;
}

export function THead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <thead className={["bg-white/5 border-b border-white/10", className ?? ""].join(" ")}>
      {children}
    </thead>
  );
}

export function TBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tbody className={className}>{children}</tbody>;
}

export function Tr({
  children,
  className,
  onClick,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <tr 
      className={["hover:bg-white/5 transition-colors duration-150 border-b border-white/5 last:border-0", className ?? ""].join(" ")} 
      onClick={onClick} 
      title={title}
    >
      {children}
    </tr>
  );
}

export function Th({
  children,
  className,
  align = "center",
  w,
}: {
  children: React.ReactNode;
  className?: string;
  align?: Align;
  w?: number;
}) {
  return (
    <th
      style={w ? { width: w } : undefined}
      className={[
        "px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fbst-text-muted)] opacity-60",
        alignCls(align),
        className ?? "",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = "center",
}: {
  children: React.ReactNode;
  className?: string;
  align?: Align;
}) {
  return (
    <td
      className={[
        "px-6 py-4 align-middle text-[var(--fbst-text-primary)] text-[13px] font-bold tabular-nums tracking-tight",
        alignCls(align),
        className ?? "",
      ].join(" ")}
    >
      {children}
    </td>
  );
}
