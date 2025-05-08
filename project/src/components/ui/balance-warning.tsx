import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BalanceWarningProps {
  message: string;
  className?: string;
}

const BalanceWarning: React.FC<BalanceWarningProps> = ({ message, className }) => {
  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800",
      className
    )}>
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <p className="text-sm">{message}</p>
    </div>
  );
};

export default BalanceWarning; 