import React from 'react';
import { RiskLevel } from '../../types';
import { cn } from '../../lib/utils';

interface RiskLevelBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskLevelBadge({ level, className }: RiskLevelBadgeProps) {
  const getRiskLevelColor = (level: RiskLevel) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      getRiskLevelColor(level),
      className
    )}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}