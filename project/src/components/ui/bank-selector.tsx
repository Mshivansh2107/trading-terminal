import React from 'react';
import { useAtom } from 'jotai';
import { banksAtom } from '../../store/data';
import { CustomSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface BankSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function BankSelector({ 
  value, 
  onChange, 
  placeholder = "Select a bank", 
  disabled = false,
  required = false,
  className = ""
}: BankSelectorProps) {
  const [banks] = useAtom(banksAtom);
  
  // Ensure we have a string value
  const safeValue = value || '';

  // Fallback banks to use if no banks are in the store
  const fallbackBanks = [
    { id: 'idbi', name: 'IDBI' },
    { id: 'indusind-ss', name: 'INDUSIND SS' },
    { id: 'hdfc-caa-ss', name: 'HDFC CAA SS' },
    { id: 'bob-ss', name: 'BOB SS' },
    { id: 'canara-ss', name: 'CANARA SS' },
    { id: 'hdfc-ss', name: 'HDFC SS' },
    { id: 'indusind-blynk', name: 'INDUSIND BLYNK' },
    { id: 'pnb', name: 'PNB' },
  ];

  // Use banks from store if available, otherwise use fallback
  const bankOptions = banks.length > 0 
    ? banks.filter(bank => bank.isActive) 
    : fallbackBanks;
    
  // Handle value change with safety checks
  const handleValueChange = (newValue: string) => {
    if (newValue && onChange) {
      onChange(newValue);
    }
  };

  // Check if the current value exists in the options
  const valueExists = bankOptions.some(bank => bank.name === safeValue);
  
  // Log current state for debugging
  React.useEffect(() => {
    console.log('Bank Options:', bankOptions);
    console.log('Current Bank Value:', safeValue);
  }, [bankOptions, safeValue]);

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
        {bankOptions.length > 0 ? (
          bankOptions.map((bank) => (
            <SelectItem key={bank.id} value={bank.name}>
              {bank.name}
            </SelectItem>
          ))
        ) : (
          <div className="p-2 text-sm text-red-500">No banks available. Please add banks first.</div>
        )}
      </SelectContent>
    </CustomSelect>
  );
} 