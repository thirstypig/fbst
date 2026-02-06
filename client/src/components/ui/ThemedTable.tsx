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
    <thead className={`bg-white/5 border-b border-white/10 ${className}`}>
      {children}
    </thead>
  );
}

interface ThemedThProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function ThemedTh({ children, className = '', align = 'left' }: ThemedThProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];
  
  return (
    <th className={`px-4 py-4 ${alignClass} text-[10px] font-bold uppercase tracking-widest text-[var(--fbst-text-muted)] ${className}`}>
      {children}
    </th>
  );
}

interface ThemedTrProps {
  children: React.ReactNode;
  className?: string;
  isOdd?: boolean;
}

export function ThemedTr({ children, className = '' }: ThemedTrProps) {
  return (
    <tr className={`border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors duration-150 ${className}`}>
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
