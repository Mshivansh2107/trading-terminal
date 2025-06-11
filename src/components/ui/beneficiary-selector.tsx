import React from 'react';
import { useAtom } from 'jotai';
import { beneficiariesAtom } from '../../store/data';
import { CustomSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface BeneficiarySelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function BeneficiarySelector({ 
  value, 
  onChange, 
  placeholder = "Select a beneficiary", 
  disabled = false,
  required = false,
  className = ""
}: BeneficiarySelectorProps) {
  const [beneficiaries] = useAtom(beneficiariesAtom);
  
  // Ensure we have a string value
  const safeValue = value || '';

  // Use beneficiaries from store only
  const beneficiaryOptions = beneficiaries || [];
    
  // Handle value change with safety checks
  const handleValueChange = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  // Check if the current value exists in the options
  const valueExists = beneficiaryOptions.some(beneficiary => beneficiary.id === safeValue);
  
  return (
    <CustomSelect
      value={valueExists ? safeValue : ''}
      onValueChange={handleValueChange}
      disabled={disabled}
      required={required}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">None (Manual Entry)</SelectItem>
        {beneficiaryOptions.length > 0 ? (
          beneficiaryOptions.map((beneficiary) => (
            <SelectItem key={beneficiary.id} value={beneficiary.id}>
              {beneficiary.name} - {beneficiary.contactNo}
            </SelectItem>
          ))
        ) : (
          <div className="p-2 text-sm text-gray-500">No beneficiaries available. Add beneficiaries in CRM tab.</div>
        )}
      </SelectContent>
    </CustomSelect>
  );
}