import React, { forwardRef } from 'react';

import { LoadingSpinner, Icon } from '@/components';

interface AutocompleteInputProps {
  query: string;
  placeholder: string;
  isLoading: boolean;
  isOpen: boolean;
  selectedIndex: number;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus: () => void;
  className?: string;
  inputClassName?: string;
  wrapperClassName?: string;
  suffixClassName?: string;
  searchIconClassName?: string;
}

export const AutocompleteInput = forwardRef<HTMLInputElement, AutocompleteInputProps>(
  ({ 
    query,
    placeholder,
    isLoading,
    isOpen,
    selectedIndex,
    onInputChange,
    onKeyDown,
    onFocus,
    className = '',
    inputClassName = '',
    wrapperClassName = '',
    suffixClassName = '',
    searchIconClassName = ''
  }, ref) => {
    return (
      <div className={`${wrapperClassName} ${className}`}>
        <input
          ref={ref}
          type="text"
          value={query}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          placeholder={placeholder}
          className={inputClassName}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
          autoComplete="off"
        />
        
        <div className={suffixClassName}>
          {isLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Icon name="search" size="sm" className={searchIconClassName} />
          )}
        </div>
      </div>
    );
  }
);

AutocompleteInput.displayName = 'AutocompleteInput';