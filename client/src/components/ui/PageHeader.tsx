import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  rightElement?: React.ReactNode;
  className?: string;
  backTo?: string;
}

export default function PageHeader({ title, subtitle, rightElement, className, backTo }: PageHeaderProps) {
  return (
    <div className={`py-6 px-4 md:px-8 mb-6 bg-[var(--fbst-surface-primary)] border-b border-[var(--fbst-table-border)] ${className || ''}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          {backTo && (
              <Link to={backTo} className="mb-2 inline-flex items-center text-sm text-[var(--fbst-text-muted)] hover:text-white transition-colors">
                  &larr; Back
              </Link>
          )}
          <h1 className="text-3xl font-bold font-sans text-[var(--fbst-text-heading)] drop-shadow-sm text-center md:text-left">
              {title}
          </h1>
          {subtitle && (
              <div className="mt-1 text-sm text-[var(--fbst-text-muted)] font-medium max-w-2xl text-center md:text-left">
                {subtitle}
              </div>
          )}
        </div>
        {rightElement && (
            <div className="flex justify-center md:justify-end">
                {rightElement}
            </div>
        )}
      </div>
    </div>
  );
}
