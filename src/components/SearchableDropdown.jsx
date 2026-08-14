import { useEffect, useMemo, useState } from 'react';
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
}) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!onSearch) return undefined;
    const timer = window.setTimeout(() => onSearch(inputValue), 300);
    return () => window.clearTimeout(timer);
  }, [inputValue, onSearch]);

  const selectedOption = useMemo(() => {
    const stringValue = String(value || '');
    return options.find((option) => String(getOptionValue(option)) === stringValue) || null;
  }, [getOptionValue, options, value]);

  return (
    <Autocomplete
      options={options}
      value={selectedOption}
      inputValue={inputValue}
      onInputChange={(event, nextValue) => setInputValue(nextValue)}
      onChange={(event, option) => onChange(option ? getOptionValue(option) : '')}
      getOptionLabel={(option) => getOptionLabel(option)}
      isOptionEqualToValue={(option, selected) => String(getOptionValue(option)) === String(getOptionValue(selected))}
      loading={loading}
      disabled={disabled}
      noOptionsText="No matching records found"
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
