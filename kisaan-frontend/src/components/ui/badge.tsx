import * as React from "react";
import { cn } from "../../lib/utils";
import { badgeVariants, userTypeBadgeStyles } from "./badge.utils";


export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  userType?: 'BUYER' | 'FARMER' | 'SHOP';
}

// Reusable status badge for transaction/payment status
export type StatusType =
  | 'pending'
  | 'partial'
  | 'completed'
  | 'cancelled'
  | 'settled'
  | 'paid'
  | 'failed';

export const StatusBadge: React.FC<{ status: StatusType; className?: string }> = ({ status, className }) => {
  let color = '';
  let label = '';
  switch (status.toLowerCase()) {
    case 'paid':
    case 'completed':
    case 'settled':
      color = 'bg-green-100 text-green-800 border-green-300';
      label = status.charAt(0).toUpperCase() + status.slice(1);
      break;
    case 'pending':
    case 'partial':
      color = 'bg-yellow-100 text-yellow-800 border-yellow-300';
      label = status === 'partial' ? 'Partial' : 'Pending';
      break;
    case 'cancelled':
      color = 'bg-gray-200 text-gray-700 border-gray-300';
      label = 'Cancelled';
      break;
    case 'failed':
      color = 'bg-red-100 text-red-800 border-red-300';
      label = 'Failed';
      break;
    default:
      color = 'bg-gray-100 text-gray-800 border-gray-300';
      label = status;
  }
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', color, className)}>
      {label}
    </span>
  );
};

function Badge({ className, variant, userType, children, ...props }: BadgeProps) {
  if (userType) {
    const style = userTypeBadgeStyles[userType.toUpperCase()] || '';
    // Capitalize label for userType
    const label = userType.charAt(0) + userType.slice(1).toLowerCase();
    return (
      <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", style, className)} {...props}>
        {children ?? label}
      </div>
    );
  }
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </div>
  );
}

export { Badge };
