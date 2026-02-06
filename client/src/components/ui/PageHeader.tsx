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
    <div className={`py-12 mb-8 ${className || ''}`}>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="space-y-2">
          {backTo && (
              <Link to={backTo} className="mb-4 inline-flex items-center text-xs font-bold uppercase tracking-widest text-[var(--fbst-text-muted)] hover:text-[var(--fbst-accent)] transition-colors">
                  &larr; Back to Safety
              </Link>
          )}
          <h1 className="text-5xl font-black tracking-tighter text-[var(--fbst-text-heading)] drop-shadow-sm leading-none">
              {title}
          </h1>
          {subtitle && (
              <div className="text-sm text-[var(--fbst-text-secondary)] font-medium max-w-2xl leading-relaxed">
                {subtitle}
              </div>
          )}
        </div>
        {rightElement && (
            <div className="flex items-center">
                {rightElement}
            </div>
        )}
      </div>
    </div>
  );
}
