import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemedTableProps {
  children: React.ReactNode;
  className?: string;
}

export function ThemedTable({ children, className = '' }: ThemedTableProps) {
  const { theme } = useTheme();
  
  return (
    <div className={`overflow-x-auto rounded-lg ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white'} ${className}`}>
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
  const { theme } = useTheme();
  
  return (
    <thead className={`${theme === 'dark' ? 'bg-slate-900/70 border-b border-slate-800' : 'bg-gray-100 border-b border-gray-300'} ${className}`}>
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
  const { theme } = useTheme();
  
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];
  
  return (
    <th className={`px-4 py-3 ${alignClass} text-xs font-medium uppercase tracking-wide ${
      theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
    } ${className}`}>
      {children}
    </th>
  );
}

interface ThemedTrProps {
  children: React.ReactNode;
  className?: string;
  isOdd?: boolean;
}

export function ThemedTr({ children, className = '', isOdd = false }: ThemedTrProps) {
  const { theme } = useTheme();
  
  const bgClass = theme === 'dark'
    ? isOdd ? 'bg-slate-950/60' : 'bg-slate-950'
    : isOdd ? 'bg-gray-50' : 'bg-white';
  
  const borderClass = theme === 'dark' ? 'border-slate-800/70' : 'border-gray-200';
  
  return (
    <tr className={`border-t ${borderClass} ${bgClass} ${className}`}>
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
  const { theme } = useTheme();
  
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];
  
  return (
    <td 
      colSpan={colSpan}
      className={`px-4 py-3 ${alignClass} ${
        theme === 'dark' ? 'text-slate-300' : 'text-gray-900'
      } ${className}`}
    >
      {children}
    </td>
  );
}
