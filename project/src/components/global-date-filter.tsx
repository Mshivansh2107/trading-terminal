import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { dateRangeAtom, dateRangeDisplayAtom } from '../store/filters';
import { refreshDataAtom } from '../store/data';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, X, RefreshCw } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import DatePicker from 'react-datepicker';
import { startOfToday, startOfWeek, startOfMonth, subMonths, subDays, parseISO, startOfDay, endOfDay, isSameDay } from 'date-fns';
import DateRangeFilter from './date-range-filter';

const GlobalDateFilter = () => {
  const [dateRange, setDateRange] = useAtom(dateRangeAtom);
  const [dateRangeDisplay] = useAtom(dateRangeDisplayAtom);
  const [, refreshData] = useAtom(refreshDataAtom);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Function to refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Local state for the date picker - convert ISO strings to Date objects
  const [startDate, setStartDate] = useState<Date | null>(new Date(dateRange.startDate));
  const [endDate, setEndDate] = useState<Date | null>(new Date(dateRange.endDate));
  
  const handleRangeChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };
  
  const applyFilter = async () => {
    if (startDate && endDate) {
      setDateRange({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isActive: true
      });
      setIsOpen(false);
      // Refresh data when filter is applied
      await handleRefresh();
    }
  };
  
  const clearFilter = async () => {
    const defaultStart = subMonths(new Date(), 3);
    const defaultEnd = new Date();
    
    setDateRange({
      startDate: defaultStart.toISOString(),
      endDate: defaultEnd.toISOString(),
      isActive: false
    });
    
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setIsOpen(false);
    
    // Refresh data when filter is cleared
    await handleRefresh();
  };
  
  const applyPreset = async (preset: string) => {
    const now = new Date();
    let start: Date;
    let end = now;
    
    switch (preset) {
      case 'today':
        start = new Date(now);
        break;
      case 'yesterday':
        start = subDays(now, 1);
        end = subDays(now, 1);
        break;
      case 'last7days':
        start = subDays(now, 6);
        break;
      case 'last30days':
        start = subDays(now, 29);
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        break;
      case 'last3months':
        start = subMonths(now, 3);
        break;
      case 'last6months':
        start = subMonths(now, 6);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'lastYear':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        start = subMonths(now, 3);
    }
    
    setStartDate(start);
    setEndDate(end);
    
    setDateRange({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      isActive: true
    });
    
    setIsOpen(false);
    
    // Refresh data when preset is applied
    await handleRefresh();
  };

  const handleSetToday = async () => {
    const today = new Date();
    setDateRange({
      startDate: startOfDay(today).toISOString(),
      endDate: endOfDay(today).toISOString(),
      isActive: true
    });
    
    // Refresh data when changing to today
    await handleRefresh();
  };

  const handleSetThisWeek = async () => {
    const today = new Date();
    setDateRange({
      startDate: startOfWeek(today, { weekStartsOn: 1 }).toISOString(),
      endDate: endOfDay(today).toISOString(),
      isActive: true
    });
    
    // Refresh data when changing to this week
    await handleRefresh();
  };

  const handleSetThisMonth = async () => {
    const today = new Date();
    setDateRange({
      startDate: startOfMonth(today).toISOString(),
      endDate: endOfDay(today).toISOString(),
      isActive: true
    });
    
    // Refresh data when changing to this month
    await handleRefresh();
  };

  const handleSetLastMonth = async () => {
    const today = new Date();
    const lastMonth = subMonths(today, 1);
    setDateRange({
      startDate: startOfMonth(lastMonth).toISOString(),
      endDate: endOfDay(today).toISOString(),
      isActive: true
    });
    
    // Refresh data when changing to last month
    await handleRefresh();
  };

  const toggleActive = async () => {
    setDateRange({
      ...dateRange,
      isActive: !dateRange.isActive
    });
    
    // Refresh data when toggling filter
    await handleRefresh();
  };

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 pb-2 pt-2 shadow-sm dark:bg-gray-900 dark:border-gray-800">
      <div className="container mx-auto px-4 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSetToday} 
            className={dateRange.isActive && isSameDay(parseISO(dateRange.startDate), startOfToday()) 
              ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 hover:text-blue-800 font-medium' 
              : 'border-gray-300 text-white hover:bg-gray-100 hover:text-gray-900'}
          >
            Today
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSetThisWeek}
            className="border-gray-300 text-white hover:bg-gray-100 hover:text-gray-900"
          >
            This Week
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSetThisMonth}
            className="border-gray-300 text-white hover:bg-gray-100 hover:text-gray-900"
          >
            This Month
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSetLastMonth}
            className="border-gray-300 text-white hover:bg-gray-100 hover:text-gray-900"
          >
            Last Month
          </Button>
          <Button 
            variant={dateRange.isActive ? "default" : "outline"} 
            size="sm" 
            onClick={toggleActive}
            className={dateRange.isActive 
              ? "ml-2 bg-blue-600 hover:bg-blue-700 text-white" 
              : "ml-2 border-gray-300 text-white hover:bg-gray-100 hover:text-gray-900"}
          >
            {dateRange.isActive ? "Filtering Active" : "Filtering Disabled"}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing} 
            className="border-gray-300 text-white hover:bg-gray-100 hover:text-gray-900 ml-2"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {dateRange.isActive ? (
              <span className="flex items-center">
                <CalendarIcon className="inline-block mr-1 h-4 w-4 text-gray-500" />
                {dateRangeDisplay}
              </span>
            ) : (
              <span>All Time</span>
            )}
          </div>
          <DateRangeFilter showLabel={false} />
        </div>
      </div>
    </div>
  );
};

export default GlobalDateFilter; 