import React from 'react';
import { useAtom } from 'jotai';
import { platformsAtom } from '../../store/data';
import { CustomSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface PlatformSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function PlatformSelector({ 
  value, 
  onChange, 
  placeholder = "Select a platform", 
  disabled = false,
  required = false,
  className = ""
}: PlatformSelectorProps) {
  const [platforms] = useAtom(platformsAtom);

  // Ensure we have a string value
  const safeValue = value || '';

  // Fallback platforms to use if no platforms are in the store
  const fallbackPlatforms = [
    { id: 'binance-ss', name: 'BINANCE SS' },
    { id: 'binance-as', name: 'BINANCE AS' },
    { id: 'bybit-ss', name: 'BYBIT SS' },
    { id: 'bybit-as', name: 'BYBIT AS' },
    { id: 'bitget-ss', name: 'BITGET SS' },
    { id: 'bitget-as', name: 'BITGET AS' },
    { id: 'kucoin-ss', name: 'KUCOIN SS' },
    { id: 'kucoin-as', name: 'KUCOIN AS' },
    { id: 'adjustment', name: 'ADJUSTMENT' },
  ];

  // Use platforms from store if available, otherwise use fallback
  const platformOptions = platforms.length > 0 
    ? platforms.filter(platform => platform.isActive) 
    : fallbackPlatforms;

  // Handle value change with safety checks
  const handleValueChange = (newValue: string) => {
    if (newValue && onChange) {
      onChange(newValue);
    }
  };

  // Check if the current value exists in the options
  const valueExists = platformOptions.some(platform => platform.name === safeValue);

  // Log current state for debugging
  React.useEffect(() => {
    console.log('Platform Options:', platformOptions);
    console.log('Current Value:', safeValue);
  }, [platformOptions, safeValue]);

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
        {platformOptions.length > 0 ? (
          platformOptions.map((platform) => (
            <SelectItem key={platform.id} value={platform.name}>
              {platform.name}
            </SelectItem>
          ))
        ) : (
          <div className="p-2 text-sm text-red-500">No platforms available. Please add platforms first.</div>
        )}
      </SelectContent>
    </CustomSelect>
  );
} 