import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { subMonths } from 'date-fns';

// Default to last 3 months range
const defaultStartDate = subMonths(new Date(), 3);
const defaultEndDate = new Date();

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
    
    // Convert ISO string dates back to Date objects
    const startDate = new Date(rangeData.startDate);
    const endDate = new Date(rangeData.endDate);
    
    // If filtering is not active, always return true
    if (!isActive) return true;
    
    // Parse the date if it's a string
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Normalize dates to start/end of day for accurate comparison
    const startTime = new Date(startDate).setHours(0, 0, 0, 0);
    const endTime = new Date(endDate).setHours(23, 59, 59, 999);
    const dateTime = dateObj.getTime();
    
    return dateTime >= startTime && dateTime <= endTime;
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
    
    if (!isActive) return 'All Time';
    
    // Ensure we're working with Date objects, not strings
    const startDate = new Date(rangeData.startDate);
    const endDate = new Date(rangeData.endDate);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
); 