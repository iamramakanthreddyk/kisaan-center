import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { normalizeRole, getQuickActions } from '@/config/navigationConfig';
import { ResponsiveGrid } from '@/components/ui/ResponsiveGrid';
import { colors } from '@/config/designTokens';

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const quick = getQuickActions(role);

  if (!quick.length) return null;

  return (
    <ResponsiveGrid minColWidth="8.5rem" className="w-full" gap="gap-3 sm:gap-4">
      {quick.map(item => {
  const highlight = item.key === 'simple-transactions'; // Only highlight Quick Sale
        return (
          <Button
            key={item.key}
            onClick={() => navigate(item.href)}
            aria-label={item.label}
            variant={highlight ? 'default' : 'outline'}
            className={`h-24 sm:h-24 flex flex-col items-center justify-center space-y-2 focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors text-center ${highlight ? colors.accentGreen + ' text-white' : ''}`}
          >
            {item.icon && <item.icon className="h-6 w-6" />}
            <span
              className="text-xs sm:text-sm font-medium leading-snug break-words whitespace-normal max-w-[9ch] sm:max-w-[14ch] md:max-w-[16ch]"
              style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              title={item.label}
            >
              {item.label}
            </span>
          </Button>
        );
      })}
    </ResponsiveGrid>
  );
};