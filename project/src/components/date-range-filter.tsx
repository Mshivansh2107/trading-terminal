import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { dateRangeAtom, dateRangeDisplayAtom } from '../store/filters';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Calendar, FilterIcon, X } from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from './ui/popover';
import { subDays, subMonths, subYears, startOfMonth } from 'date-fns';

const DateRangeFilter = () => {
  const [dateRange, setDateRange] = useAtom(dateRangeAtom);
  const [dateRangeDisplay] = useAtom(dateRangeDisplayAtom);
  const [isOpen, setIsOpen] = useState(false);
  
  // Local state for the date picker - convert ISO strings to Date objects
  const [startDate, setStartDate] = useState<Date | null>(new Date(dateRange.startDate));
  const [endDate, setEndDate] = useState<Date | null>(new Date(dateRange.endDate));
  
  // Update local state when dateRange atom changes
  useEffect(() => {
    setStartDate(new Date(dateRange.startDate));
    setEndDate(new Date(dateRange.endDate));
  }, [dateRange]);
  
  const handleRangeChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };
  
  const applyFilter = () => {
    if (startDate && endDate) {
      setDateRange({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isActive: true
      });
      setIsOpen(false);
    }
  };
  
  const clearFilter = () => {
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
  };
  
  const applyPreset = (preset: string) => {
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
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          <span className="hidden md:inline">Date Range:</span>{' '}
          <span className="font-medium">
            {dateRange.isActive ? dateRangeDisplay : 'All Time'}
          </span>
          {dateRange.isActive && (
            <X 
              className="h-3 w-3 ml-1 text-gray-500 hover:text-gray-700" 
              onClick={(e) => {
                e.stopPropagation();
                clearFilter();
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Card className="border-0 shadow-none">
          <CardContent className="p-3">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => applyPreset('today')}>Today</Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset('yesterday')}>Yesterday</Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset('last7days')}>Last 7 Days</Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset('last30days')}>Last 30 Days</Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset('thisMonth')}>This Month</Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset('last3months')}>Last 3 Months</Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset('last6months')}>Last 6 Months</Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset('thisYear')}>This Year</Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset('lastYear')}>Last Year</Button>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-2">Custom Range</p>
                <DatePicker
                  selected={startDate}
                  onChange={handleRangeChange}
                  startDate={startDate}
                  endDate={endDate}
                  selectsRange
                  inline
                />
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={clearFilter}>
                  Clear
                </Button>
                <Button onClick={applyFilter}>
                  Apply Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangeFilter; 