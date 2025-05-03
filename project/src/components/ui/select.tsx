import * as React from "react";
import { cn } from "../../lib/utils";
import { ChevronDown } from "lucide-react";

// Basic Select component
export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const BasicSelect = React.forwardRef<HTMLSelectElement, SelectProps>(
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
BasicSelect.displayName = "BasicSelect";

// Custom SelectContext for our enhanced select UI
type SelectContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const SelectContext = React.createContext<SelectContextValue>({
  open: false,
  setOpen: () => {}
});

// Custom Select Root
interface CustomSelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

const Select: React.FC<CustomSelectProps> = ({ 
  children, 
  value, 
  onValueChange,
  disabled = false,
  required = false
}) => {
  const [open, setOpen] = React.useState(false);

  // Handle value change
  const handleValueChange = React.useCallback((newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue);
      setOpen(false); // Close the dropdown after selection
    }
  }, [onValueChange]);

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen }}>
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
  const { open, setOpen } = React.useContext(SelectContext);
  
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
  const { open } = React.useContext(SelectContext);
  
  if (!open) return null;
  
  return (
    <div className={cn(
      "fixed z-[9999] min-w-[8rem] overflow-hidden rounded-md border bg-white shadow-lg",
      className
    )}
    style={{
      position: 'absolute',
      top: 'calc(100% + 4px)',
      left: 0,
      width: '100%',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    }}
    >
      <div className="max-h-[200px] overflow-auto p-1">
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
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm font-medium hover:bg-gray-100",
        isSelected ? "bg-blue-100 text-blue-800" : "text-gray-800",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};

export {
  BasicSelect as Select,
  Select as CustomSelect,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
};