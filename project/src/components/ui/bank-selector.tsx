import React from 'react';
import { useAtom } from 'jotai';
import { banksAtom } from '../../store/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

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

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      required={required}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {bankOptions.map((bank) => (
          <SelectItem key={bank.id} value={bank.name}>
            {bank.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 