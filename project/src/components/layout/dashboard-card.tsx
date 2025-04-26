import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';

interface DashboardCardProps {
  title: string;
  value: string | number;
  secondaryValue?: string | number;
  children?: React.ReactNode;
  className?: string;
  valueClassName?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  secondaryValue,
  children,
  className,
  valueClassName,
  trend,
  icon,
}) => {
  return (
    <Card className={cn("shadow-sm hover:shadow transition-all", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
        {trend && (
          <div className={cn(
            "p-1 rounded-full",
            trend === 'up' ? 'bg-green-100' : trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
          )}>
            <span className={cn(
              "text-xs font-medium",
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
            )}>
              {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '■'}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <span className={cn(
            trend === 'up' ? 'text-green-600' : 
            trend === 'down' ? 'text-red-600' : '', 
            valueClassName
          )}>
            {value}
          </span>
          {secondaryValue && (
            <span className="text-sm text-gray-500 ml-2">
              {secondaryValue}
            </span>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
};

export default DashboardCard;