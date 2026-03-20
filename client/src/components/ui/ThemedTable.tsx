import React from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCompactProvider,
} from './table';

interface ThemedTableProps {
  children: React.ReactNode;
  className?: string;
  /** Set to true if this table is already inside a styled container */
  bare?: boolean;
  /** Compact mode — tighter padding for embedded panels (auction, sidebars) */
  compact?: boolean;
}

/**
 * ThemedTable - Wraps shadcn Table with optional liquid-glass container.
 * Set `bare={true}` if already inside a glass container.
 * Set `compact={true}` for tighter padding (auction panels, etc.).
 */
export function ThemedTable({ children, className = '', bare = false, compact = false }: ThemedTableProps) {
  const content = compact ? (
    <TableCompactProvider compact>
      {bare ? (
        <Table className={className}>{children}</Table>
      ) : (
        <div className={cn('overflow-x-auto rounded-2xl liquid-glass', className)}>
          <table className="w-full caption-bottom text-sm">{children}</table>
        </div>
      )}
    </TableCompactProvider>
  ) : bare ? (
    <Table className={className}>{children}</Table>
  ) : (
    <div className={cn('overflow-x-auto rounded-2xl liquid-glass', className)}>
      <table className="w-full caption-bottom text-sm">{children}</table>
    </div>
  );

  return content;
}

interface ThemedTheadProps {
  children: React.ReactNode;
  className?: string;
}

export function ThemedThead({ children, className = '' }: ThemedTheadProps) {
  return <TableHeader className={className}>{children}</TableHeader>;
}

export function ThemedTbody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <TableBody className={className}>{children}</TableBody>;
}

interface ThemedThProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  onClick?: () => void;
  title?: string;
}

export function ThemedTh({ children, className = '', align = 'left', onClick, title }: ThemedThProps) {
  const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' }[align];

  return (
    <TableHead
      onClick={onClick}
      title={title}
      className={cn(
        alignClass,
        onClick && 'cursor-pointer hover:text-[var(--lg-accent)]',
        className
      )}
    >
      {children}
    </TableHead>
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
    <TableRow
      onClick={onClick}
      className={cn(onClick && 'cursor-pointer', className)}
    >
      {children}
    </TableRow>
  );
}

interface ThemedTdProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  colSpan?: number;
}

export function ThemedTd({ children, className = '', align = 'left', colSpan }: ThemedTdProps) {
  const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' }[align];

  return (
    <TableCell colSpan={colSpan} className={cn(alignClass, className)}>
      {children}
    </TableCell>
  );
}
