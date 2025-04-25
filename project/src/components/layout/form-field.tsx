import React from 'react';
import { Input, InputProps } from '../ui/input';
import { Select } from '../ui/select';

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  className?: string;
  children?: React.ReactNode;
  options?: { value: string; label: string }[];
  inputProps?: InputProps;
  error?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  required = false,
  className = '',
  children,
  options,
  inputProps,
  error,
}) => {
  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {type === 'select' && options ? (
        <Select 
          id={name} 
          name={name}
          required={required}
          className="w-full"
          {...inputProps}
        >
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ) : (
        <Input
          type={type}
          id={name}
          name={name}
          required={required}
          className="w-full"
          {...inputProps}
        />
      )}
      
      {children}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default FormField;