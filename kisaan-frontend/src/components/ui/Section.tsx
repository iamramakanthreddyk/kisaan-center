import React from 'react';
import clsx from 'clsx';

export interface SectionProps {
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean; // internal padding wrapper
  gutter?: boolean; // horizontal page gutters
  id?: string;
}

/**
 * Section - consistent vertical rhythm + optional header.
 * Mobile-first: tighter spacing on small screens, expands on sm+.
 */
export const Section: React.FC<SectionProps> = ({
  title,
  description,
  actions,
  children,
  className,
  padded = false,
  gutter = false,
  id
}) => {
  return (
    <section
      id={id}
      className={clsx(
        'w-full',
        'flex flex-col gap-3 sm:gap-4',
        gutter && 'px-2 sm:px-4',
        className
      )}
    >
      {(title || description || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0 space-y-1">
            {title && (
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900 truncate">{title}</h2>
            )}
            {description && (
              <p className="text-sm sm:text-base text-gray-600 leading-snug">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex-shrink-0 flex items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      <div className={clsx(padded && 'bg-white rounded-lg p-3 sm:p-4 shadow-sm border')}>{children}</div>
    </section>
  );
};

export default Section;
