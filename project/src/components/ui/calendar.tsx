"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { Button } from "./button";

export type CalendarProps = {
  mode?: "single";
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  initialFocus?: boolean;
};

export function Calendar({
  mode = "single",
  selected,
  onSelect,
  initialFocus,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  
  // Navigate to prev/next month
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  
  // Get days to display in calendar
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });
  
  // Handle day selection
  const handleDayClick = (day: Date) => {
    if (onSelect) {
      onSelect(day);
    }
  };
  
  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={prevMonth}
          className="h-7 w-7 p-0 rounded-full"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous month</span>
        </Button>
        <div className="font-medium">
          {format(currentMonth, "MMMM yyyy")}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={nextMonth}
          className="h-7 w-7 p-0 rounded-full"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next month</span>
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div 
            key={day} 
            className="h-8 flex items-center justify-center text-xs font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
        
        {days.map((day) => {
          const isSelectedDay = selected && isSameDay(day, selected);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);
          
          return (
            <div
              key={day.toString()}
              className="h-8 flex items-center justify-center p-0"
            >
              <button
                type="button"
                onClick={() => handleDayClick(day)}
                className={`
                  h-8 w-8 rounded-full flex items-center justify-center text-sm
                  ${isCurrentMonth ? '' : 'text-gray-300'}
                  ${isSelectedDay ? 'bg-blue-500 text-white' : ''}
                  ${isCurrentDay && !isSelectedDay ? 'border border-blue-500' : ''}
                  ${isCurrentMonth && !isSelectedDay ? 'hover:bg-gray-100' : ''}
                `}
              >
                {format(day, "d")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
} 