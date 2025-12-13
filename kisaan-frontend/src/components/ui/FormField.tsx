import React from 'react';
import { Label } from './label';
import clsx from 'clsx';

export interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  inline?: boolean; // horizontal layout (future use)
  description?: string;
  error?: string | null;
  children: React.ReactNode; // input/select element
  className?: string;
  labelClassName?: string;
  compact?: boolean; // tighter vertical spacing for dense forms
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  required,
  description,
  error,
  children,
  className,
  labelClassName,
  compact
}) => {
  return (
    <div className={clsx('w-full', compact ? 'space-y-1.5' : 'space-y-2', className)}>
      <div className="flex items-center gap-1">
        <Label htmlFor={id} className={clsx('text-sm font-medium', labelClassName)}>
          {label} {required && <span className="text-red-600">*</span>}
        </Label>
      </div>
      {children}
      {description && !error && (
        <p className="text-xs text-gray-500 leading-snug">{description}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 font-medium" role="alert">{error}</p>
      )}
    </div>
  );
};

export default FormField;
