#!/bin/bash

# Install required packages for date filtering
echo "Installing required packages for date filtering functionality..."
npm install react-datepicker date-fns

# Add TypeScript types for react-datepicker
echo "Adding TypeScript types for react-datepicker..."
npm install --save-dev @types/react-datepicker

# Install UI component dependencies
echo "Installing UI component dependencies..."
npm install @radix-ui/react-popover clsx tailwind-merge

# Add missing cn utility function to utils.ts
echo "Adding cn utility function to utils.ts..."
cat >> project/src/lib/utils.ts << 'EOL'

// Utility for combining class names
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
EOL

echo "Installation complete! Date filtering functionality is ready to use."
echo "To enable date filtering:"
echo "1. Import the DateRangeFilter component: import DateRangeFilter from '../components/date-range-filter';"
echo "2. Add the component to your page: <DateRangeFilter />"
echo "3. Import and use filter functions in your data components: import { filterByDateAtom } from '../store/filters';" 