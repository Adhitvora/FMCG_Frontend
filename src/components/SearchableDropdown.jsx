import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';

const SearchableDropdown = ({
  label,
  value,
  onChange,
  options = [],
  getOptionLabel = (option) => option?.name || '',
  getOptionValue = (option) => option?._id || option || '',
  onSearch,
  loading = false,
  required = false,
  error,
  helperText,
  size = 'small',
  disabled = false,
  placeholder = 'Search...',
  debounceMs = 350,
  clearable = true,
}) => {
  const [inputValue, setInputValue] = useState('');
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  // Debounced search with AbortController
  useEffect(() => {
    if (!onSearch) return undefined;

    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    timerRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      onSearch(inputValue, controller.signal);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inputValue, onSearch, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const selectedOption = useMemo(() => {
    const stringValue = String(value || '');
    if (!stringValue) return null;
    return options.find((option) => String(getOptionValue(option)) === stringValue) || null;
  }, [getOptionValue, options, value]);

  const handleInputChange = useCallback((event, nextValue, reason) => {
    setInputValue(nextValue);
  }, []);

  const handleChange = useCallback((event, option) => {
    onChange(option ? getOptionValue(option) : '', option);
  }, [onChange, getOptionValue]);

  return (
    <Autocomplete
      options={options}
      value={selectedOption}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleChange}
      getOptionLabel={(option) => getOptionLabel(option)}
      isOptionEqualToValue={(option, selected) => String(getOptionValue(option)) === String(getOptionValue(selected))}
      loading={loading}
      disabled={disabled}
      disableClearable={!clearable}
      noOptionsText="No matching records found"
      filterOptions={onSearch ? (x) => x : undefined}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={error}
          helperText={helperText}
          size={size}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

export default SearchableDropdown;
