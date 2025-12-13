import { Badge } from './ui/badge';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface SettlementStatusBadgeProps {
  status?: 'UNSETTLED' | 'PARTIALLY_SETTLED' | 'FULLY_SETTLED';
  settled?: number;
  total?: number;
  showDetails?: boolean;
}

export function SettlementStatusBadge({ 
  status, 
  settled = 0, 
  total = 0,
  showDetails = false 
}: SettlementStatusBadgeProps) {
  const getVariant = () => {
    switch (status) {
      case 'FULLY_SETTLED':
        return 'default';
      case 'PARTIALLY_SETTLED':
        return 'secondary';
      case 'UNSETTLED':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'FULLY_SETTLED':
        return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case 'PARTIALLY_SETTLED':
        return <Clock className="w-3 h-3 mr-1" />;
      case 'UNSETTLED':
        return <AlertCircle className="w-3 h-3 mr-1" />;
      default:
        return null;
    }
  };

  const getText = () => {
    if (showDetails && total > 0) {
      const percent = Math.round((settled / total) * 100);
      return `${percent}% Settled`;
    }
    
    switch (status) {
      case 'FULLY_SETTLED':
        return 'Settled';
      case 'PARTIALLY_SETTLED':
        return 'Partial';
      case 'UNSETTLED':
        return 'Unsettled';
      default:
        return 'Unknown';
    }
  };

  if (!status) return null;

  return (
    <Badge variant={getVariant()} className="flex items-center gap-1">
      {getIcon()}
      <span>{getText()}</span>
    </Badge>
  );
}

export function AllocationStatusBadge({ 
  status, 
  allocated = 0, 
  total = 0,
  showDetails = false 
}: {
  status?: 'UNALLOCATED' | 'PARTIALLY_ALLOCATED' | 'FULLY_ALLOCATED';
  allocated?: number;
  total?: number;
  showDetails?: boolean;
}) {
  const getVariant = () => {
    switch (status) {
      case 'FULLY_ALLOCATED':
        return 'default';
      case 'PARTIALLY_ALLOCATED':
        return 'secondary';
      case 'UNALLOCATED':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'FULLY_ALLOCATED':
        return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case 'PARTIALLY_ALLOCATED':
        return <Clock className="w-3 h-3 mr-1" />;
      case 'UNALLOCATED':
        return <AlertCircle className="w-3 h-3 mr-1" />;
      default:
        return null;
    }
  };

  const getText = () => {
    if (showDetails && total > 0) {
      const percent = Math.round((allocated / total) * 100);
      return `${percent}% Allocated`;
    }
    
    switch (status) {
      case 'FULLY_ALLOCATED':
        return 'Allocated';
      case 'PARTIALLY_ALLOCATED':
        return 'Partial';
      case 'UNALLOCATED':
        return 'Unallocated';
      default:
        return 'Unknown';
    }
  };

  if (!status) return null;

  return (
    <Badge variant={getVariant()} className="flex items-center gap-1">
      {getIcon()}
      <span>{getText()}</span>
    </Badge>
  );
}
