import React, { useState, useRef, useEffect } from 'react';

interface OtpInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
}

const OtpInput: React.FC<OtpInputProps> = ({ length = 6, value = '', onChange }) => {
  const [otp, setOtp] = useState<string[]>(value.split('').slice(0, length));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize input refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Focus on first empty input when component mounts
  useEffect(() => {
    if (inputRefs.current[0] && !value) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Update inputs when value changes externally
  useEffect(() => {
    const newOtp = value.split('').slice(0, length);
    setOtp(newOtp.concat(Array(length - newOtp.length).fill('')));
  }, [value, length]);

  // Handle input changes and focus management
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const input = e.target;
    const newVal = input.value;
    
    // Only allow numbers and letters
    const validChars = /^[0-9a-zA-Z]$/;
    if (newVal !== '' && !validChars.test(newVal)) {
      return;
    }
    
    // Update the OTP array
    const newOtp = [...otp];
    newOtp[index] = newVal.slice(-1); // Only keep last character
    setOtp(newOtp);
    
    // Notify parent component
    onChange(newOtp.join(''));
    
    // Auto-focus next input
    if (newVal !== '' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace and delete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Focus previous input when backspace is pressed on empty input
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      // Focus previous input on left arrow
      inputRefs.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      // Focus next input on right arrow
      inputRefs.current[index + 1]?.focus();
      e.preventDefault();
    }
  };

  // Handle paste functionality
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text/plain').slice(0, length);
    
    // Only allow alphanumeric characters
    const validChars = /^[0-9a-zA-Z]+$/;
    if (!validChars.test(pasteData)) {
      return;
    }
    
    // Fill the inputs with pasted data
    const newOtp = [...Array(length).fill('')];
    pasteData.split('').forEach((char, idx) => {
      if (idx < length) {
        newOtp[idx] = char;
      }
    });
    
    setOtp(newOtp);
    onChange(newOtp.join(''));
    
    // Focus the next empty input or the last input
    const nextEmptyIndex = newOtp.findIndex(val => val === '');
    const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array(length).fill(0).map((_, index) => (
        <input
          key={index}
          ref={el => inputRefs.current[index] = el}
          type="text"
          inputMode="text"
          maxLength={1}
          value={otp[index] || ''}
          onChange={e => handleChange(e, index)}
          onKeyDown={e => handleKeyDown(e, index)}
          onPaste={index === 0 ? handlePaste : undefined} // Enable paste on first input only
          className="w-12 h-14 text-center text-xl font-bold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="off"
          aria-label={`Digit ${index + 1} of OTP`}
        />
      ))}
    </div>
  );
};

export default OtpInput; 