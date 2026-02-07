import React from 'react';

interface ThemedTableProps {
  children: React.ReactNode;
  className?: string;
}

export function ThemedTable({ children, className = '' }: ThemedTableProps) {
  return (
    <div className={`overflow-x-auto rounded-3xl liquid-glass ${className}`}>
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
    <thead className={`bg-[var(--fbst-table-header-bg)] border-b border-[var(--fbst-table-border)] ${className}`}>
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
      className={`px-4 py-4 ${alignClass} text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)] ${className}`}
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
      className={`border-b border-[var(--fbst-table-border)] last:border-0 hover:bg-[var(--fbst-table-row-hover)] transition-colors duration-150 ${className}`}
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
      className={`px-4 py-4 ${alignClass} text-sm text-[var(--fbst-text-primary)] ${className}`}
    >
      {children}
    </td>
  );
}
