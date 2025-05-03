import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { subMonths, startOfDay, endOfDay, isSameDay, format, parseISO } from 'date-fns';

// Default to today's range rather than 3 months
const today = new Date();
const defaultStartDate = startOfDay(today);
const defaultEndDate = endOfDay(today);

// Create atoms for date range filtering - explicitly convert to string for storage
export const dateRangeAtom = atomWithStorage('dateRangeFilter', {
  startDate: defaultStartDate.toISOString(), // Store as ISO string
  endDate: defaultEndDate.toISOString(),     // Store as ISO string
  isActive: true
});

// Derived atom that checks if a date is within the selected range
export const isDateInRangeAtom = atom(
  (get) => (date: Date | string) => {
    const rangeData = get(dateRangeAtom);
    const { isActive } = rangeData;
    
    // If filtering is not active, always return true
    if (!isActive) return true;
    
    // Convert ISO string dates back to Date objects
    const startDateObj = new Date(rangeData.startDate);
    const endDateObj = new Date(rangeData.endDate);
    
    // Check if it's a single day selection
    const isSingleDaySelection = isSameDay(startDateObj, endDateObj);
    
    // For single day selection, ensure we cover the entire day
    const startDate = isSingleDaySelection ? startOfDay(startDateObj) : startDateObj;
    const endDate = isSingleDaySelection ? endOfDay(endDateObj) : endDateObj;
    
    // Parse the date if it's a string
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Get timestamps for comparison
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const dateTime = dateObj.getTime();
    
    return dateTime >= startTime && dateTime <= endTime;
  }
);

// Helper to check if the current date range is a single day
export const isSingleDaySelectionAtom = atom(
  (get) => {
    const rangeData = get(dateRangeAtom);
    const startDate = parseISO(rangeData.startDate);
    const endDate = parseISO(rangeData.endDate);
    
    return isSameDay(startDate, endDate);
  }
);

// Helper atom to get a filtered array based on date property
export const filterByDateAtom = atom(
  (get) => <T extends { createdAt: Date | string }>(items: T[]): T[] => {
    const isInRange = get(isDateInRangeAtom);
    const { isActive } = get(dateRangeAtom);
    
    if (!isActive) return items;
    
    return items.filter(item => isInRange(item.createdAt));
  }
);

// Format date range for display
export const dateRangeDisplayAtom = atom(
  (get) => {
    const rangeData = get(dateRangeAtom);
    const { isActive } = rangeData;
    const isSingleDay = get(isSingleDaySelectionAtom);
    
    if (!isActive) return 'All Time';
    
    // Ensure we're working with Date objects, not strings
    const startDate = new Date(rangeData.startDate);
    const endDate = new Date(rangeData.endDate);
    
    // For a single day selection, only show that day
    if (isSingleDay) {
      return format(startDate, 'MMM d, yyyy');
    }
    
    // For a date range, show start and end dates
    return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
  }
);

// Get formatted time for single-day view
export const formatTimeForSingleDayViewAtom = atom(
  (get) => (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const isSingleDay = get(isSingleDaySelectionAtom);
    
    if (isSingleDay) {
      return format(dateObj, 'h:mm a'); // Format as time only for single day
    }
    
    return format(dateObj, 'MMM d'); // Format as date for multi-day ranges
  }
);

// Helper to format date/time based on current range
export const formatDateByRangeAtom = atom(
  (get) => (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const isSingleDay = get(isSingleDaySelectionAtom);
    
    if (isSingleDay) {
      return format(dateObj, 'h:mm a'); // Time only for single day
    }
    
    return format(dateObj, 'MMM d'); // Date only for multi-day range
  }
); 