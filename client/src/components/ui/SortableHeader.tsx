import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableHead } from "./table";

const frozenThClass =
  'sticky left-0 z-20 bg-[var(--lg-table-header-sticky-bg)] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-[var(--lg-border-subtle)]';

interface SortableHeaderProps<K extends string = string> {
  /** Column key used for sort comparison */
  sortKey: K;
  /** Currently active sort key */
  activeSortKey: K;
  /** Current sort direction */
  sortDesc: boolean;
  /** Callback when header is clicked */
  onSort: (key: K) => void;
  /** Header label */
  children: React.ReactNode;
  /** Text alignment */
  align?: "left" | "center" | "right";
  /** Additional class names */
  className?: string;
  /** Title/tooltip text */
  title?: string;
  /** Freeze this header cell to the left edge on horizontal scroll */
  frozen?: boolean;
}

/**
 * SortableHeader — an accessible, sortable table header cell.
 *
 * Uses a <button> inside <th> per WAI-ARIA APG sortable table pattern.
 * Keyboard support (Enter/Space) is provided natively by the button element.
 * aria-sort is set on all columns: "ascending"/"descending" on active, "none" on others.
 */
export function SortableHeader<K extends string = string>({
  sortKey,
  activeSortKey,
  sortDesc,
  onSort,
  children,
  align = "left",
  className,
  title,
  frozen = false,
}: SortableHeaderProps<K>) {
  const isActive = activeSortKey === sortKey;
  const alignClass = { left: "text-left", center: "text-center", right: "text-right" }[align];

  const SortIcon = isActive ? (sortDesc ? ArrowDown : ArrowUp) : ArrowUpDown;

  return (
    <TableHead
      className={cn(alignClass, frozen && frozenThClass, className)}
      aria-sort={isActive ? (sortDesc ? "descending" : "ascending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={title}
        className={cn(
          "inline-flex items-center gap-1 cursor-pointer select-none",
          "hover:text-[var(--lg-accent)] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lg-accent)] focus-visible:rounded-sm",
          isActive && "text-[var(--lg-accent)]",
        )}
      >
        {children}
        <SortIcon
          size={12}
          aria-hidden="true"
          className={cn("flex-shrink-0", isActive ? "opacity-80" : "opacity-30")}
        />
      </button>
    </TableHead>
  );
}
