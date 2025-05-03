import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { dateRangeAtom, dateRangeDisplayAtom } from '../store/filters';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import DatePicker from 'react-datepicker';
import { subDays, subMonths, startOfMonth, subYears } from 'date-fns';

interface DateRangeFilterProps {
  showLabel?: boolean;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ showLabel = true }) => {
  const [dateRange, setDateRange] = useAtom(dateRangeAtom);
  const [dateRangeDisplay] = useAtom(dateRangeDisplayAtom);
  const [isOpen, setIsOpen] = useState(false);
  
  // Local state for the date picker - convert ISO strings to Date objects
  const [startDate, setStartDate] = useState<Date | null>(new Date(dateRange.startDate));
  const [endDate, setEndDate] = useState<Date | null>(new Date(dateRange.endDate));
  
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
    <div className="flex items-center gap-2">
      {showLabel && (
        <div className="text-sm font-medium">
          {dateRange.isActive ? (
            <span className="flex items-center">
              <CalendarIcon className="mr-1 h-4 w-4" />
              {dateRangeDisplay}
            </span>
          ) : (
            <span>All Time</span>
          )}
        </div>
      )}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 h-9 bg-white text-blue-700 border-white hover:bg-blue-50"
          >
            <CalendarIcon className="h-4 w-4 text-blue-600" />
            <span className="hidden md:inline">{showLabel ? "Change Range" : "Date Range"}</span>
            {dateRange.isActive && (
              <X 
                className="h-3 w-3 ml-1 text-gray-500 hover:text-red-500" 
                onClick={(e) => {
                  e.stopPropagation();
                  clearFilter();
                }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => applyPreset('today')} className="hover:bg-blue-100 hover:text-blue-700">Today</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset('yesterday')} className="hover:bg-blue-100 hover:text-blue-700">Yesterday</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset('last7days')} className="hover:bg-blue-100 hover:text-blue-700">Last 7 Days</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset('last30days')} className="hover:bg-blue-100 hover:text-blue-700">Last 30 Days</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset('thisMonth')} className="hover:bg-blue-100 hover:text-blue-700">This Month</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset('last3months')} className="hover:bg-blue-100 hover:text-blue-700">Last 3 Months</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset('last6months')} className="hover:bg-blue-100 hover:text-blue-700">Last 6 Months</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset('thisYear')} className="hover:bg-blue-100 hover:text-blue-700">This Year</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset('lastYear')} className="hover:bg-blue-100 hover:text-blue-700">Last Year</Button>
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
              <Button variant="outline" onClick={clearFilter} className="hover:bg-red-100 hover:text-red-700 hover:border-red-300">
                Clear
              </Button>
              <Button onClick={applyFilter} className="bg-blue-600 hover:bg-blue-700">
                Apply Filter
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangeFilter; 