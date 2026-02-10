import React from 'react';

interface ThemedTableProps {
  children: React.ReactNode;
  className?: string;
  /** Set to true if this table is already inside a liquid-glass container */
  bare?: boolean;
}

/**
 * ThemedTable - Standard table wrapper using liquid glass design tokens
 * 
 * By default, includes liquid-glass styling. Set `bare={true}` if the table
 * is already inside a liquid-glass container to avoid double backgrounds.
 */
export function ThemedTable({ children, className = '', bare = false }: ThemedTableProps) {
  return (
    <div className={`overflow-x-auto ${bare ? '' : 'rounded-3xl liquid-glass'} ${className}`}>
      <table className="min-w-full text-sm">
        {children}
      </table>
    </div>
  );
}

interface ThemedTheadProps {
  children: React.ReactNode;
  className?: string;
}

export function ThemedThead({ children, className = '' }: ThemedTheadProps) {
  return (
    <thead className={`bg-[var(--lg-table-header-bg)] border-b border-[var(--lg-table-border)] ${className}`}>
      {children}
    </thead>
  );
}

interface ThemedThProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  onClick?: () => void;
  title?: string;
}

export function ThemedTh({ children, className = '', align = 'left', onClick, title }: ThemedThProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];
  
  return (
    <th 
      onClick={onClick}
      title={title}
      className={`px-4 py-4 ${alignClass} text-[10px] font-black uppercase tracking-widest text-[var(--lg-text-muted)] ${onClick ? 'cursor-pointer hover:text-[var(--lg-accent)]' : ''} ${className}`}
    >
      {children}
    </th>
  );
}

interface ThemedTrProps {
  children: React.ReactNode;
  className?: string;
  isOdd?: boolean;
  onClick?: () => void;
}

export function ThemedTr({ children, className = '', onClick }: ThemedTrProps) {
  return (
    <tr 
      onClick={onClick}
      className={`border-b border-[var(--lg-table-border)] last:border-0 hover:bg-[var(--lg-table-row-hover)] transition-colors duration-150 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

interface ThemedTdProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  colSpan?: number;
}

export function ThemedTd({ children, className = '', align = 'left', colSpan }: ThemedTdProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];
  
  return (
    <td 
      colSpan={colSpan}
      className={`px-4 py-4 ${alignClass} text-sm text-[var(--lg-text-primary)] ${className}`}
    >
      {children}
    </td>
  );
}
