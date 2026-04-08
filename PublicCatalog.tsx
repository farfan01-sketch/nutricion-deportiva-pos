import { useEffect, useRef, useCallback } from 'react';

interface UseBarcodeInputOptions {
  onScan: (code: string) => void;
  autoFocus?: boolean;
}

export const useBarcodeInput = ({ onScan, autoFocus = true }: UseBarcodeInputOptions) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = e.currentTarget.value.trim();
      if (code) {
        onScan(code);
        e.currentTarget.value = ''; // Clear after scan
      }
    }
  }, [onScan]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Function to manually refocus
  const refocus = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return {
    inputRef,
    handleKeyDown,
    refocus
  };
};
