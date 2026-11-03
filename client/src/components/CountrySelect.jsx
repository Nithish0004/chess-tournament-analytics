import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Globe } from 'lucide-react';
import { ALL_COUNTRIES, getCountryData } from '../utils/countryFlags';

export const CountrySelect = ({
  value,
  onChange,
  disabled = false,
  error = null,
  placeholder = 'Select Country'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Resolve current selection
  const selectedCountry = useMemo(() => {
    if (!value) return null;
    return getCountryData(value);
  }, [value]);

  // Filter countries by search query
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.native && c.native.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current && filteredCountries.length > 0) {
      const itemElement = listRef.current.children[highlightedIndex];
      if (itemElement) {
        itemElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen, filteredCountries.length]);

  const handleSelect = (country) => {
    onChange?.(country);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < filteredCountries.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredCountries.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCountries[highlightedIndex]) {
        handleSelect(filteredCountries[highlightedIndex]);
      }
    }
  };

  return (
    <div className="relative w-full text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select Country"
        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-[#161616] border text-left transition-all outline-none ${
          error
            ? 'border-rose-500/80 focus:ring-1 focus:ring-rose-500'
            : isOpen
            ? 'border-white/40 ring-1 ring-white/20'
            : 'border-[#2a2a2a] hover:border-[#3d3d3d] focus:border-white/40'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          {selectedCountry ? (
            <>
              <span className="text-xl leading-none select-none shrink-0" aria-hidden="true">
                {selectedCountry.flag}
              </span>
              <span className="text-sm font-medium text-white truncate">
                {selectedCountry.name}
              </span>
              <span className="text-xs font-mono text-zinc-500 uppercase shrink-0">
                ({selectedCountry.code})
              </span>
            </>
          ) : (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Globe className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>{placeholder}</span>
            </div>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 bg-[#181818] border border-[#2e2e2e] rounded-xl shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          role="listbox"
        >
          {/* Search Input Box */}
          <div className="p-2.5 border-b border-[#262626] bg-[#141414]">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search country name or code..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#1f1f1f] border border-[#2e2e2e] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          {/* Scrollable Country List */}
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto divide-y divide-[#222222]/50 py-1"
            tabIndex={-1}
          >
            {filteredCountries.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-zinc-500 font-medium">
                No countries found matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              filteredCountries.map((country, idx) => {
                const isSelected = selectedCountry?.code === country.code;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={country.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(country)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-left transition-colors ${
                      isHighlighted
                        ? 'bg-[#262626] text-white'
                        : isSelected
                        ? 'bg-[#202020] text-white'
                        : 'text-zinc-300 hover:bg-[#222222]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-lg leading-none select-none shrink-0" aria-hidden="true">
                        {country.flag}
                      </span>
                      <span className={`truncate ${isSelected ? 'font-semibold text-white' : ''}`}>
                        {country.name}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                        {country.code}
                      </span>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-white shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountrySelect;
