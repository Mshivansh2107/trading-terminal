import * as React from "react";
import { cn } from "../../lib/utils";
import { ChevronDown } from "lucide-react";

// Basic Select component
export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

// Custom SelectContext for our enhanced select UI
type SelectContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
};

const SelectContext = React.createContext<SelectContextValue>({});

// Custom Select Root
interface CustomSelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
  children, 
  value, 
  onValueChange 
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div className="relative w-full">
        {children}
        {open && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setOpen(false)}
          />
        )}
      </div>
    </SelectContext.Provider>
  );
};

// SelectTrigger
interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

const SelectTrigger: React.FC<SelectTriggerProps> = ({
  children,
  className,
}) => {
  const [open, setOpen] = React.useState(false);
  
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
};

// SelectValue
interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

const SelectValue: React.FC<SelectValueProps> = ({
  placeholder,
  className,
}) => {
  const { value } = React.useContext(SelectContext);
  
  return (
    <span className={cn("flex-grow truncate", className)}>
      {value || placeholder}
    </span>
  );
};

// SelectContent
interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

const SelectContent: React.FC<SelectContentProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn(
      "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80",
      className
    )}>
      <div className="max-h-[var(--radix-select-content-available-height)] overflow-auto p-1">
        {children}
      </div>
    </div>
  );
};

// SelectItem
interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

const SelectItem: React.FC<SelectItemProps> = ({
  children,
  value,
  className,
}) => {
  const context = React.useContext(SelectContext);
  
  const handleClick = () => {
    if (context.onValueChange) {
      context.onValueChange(value);
    }
  };
  
  const isSelected = context.value === value;
  
  return (
    <div
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};

export {
  Select,
  CustomSelect as Select2,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
};