import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { productService } from '../services/product.service';
import { productQueryKeys } from '../services/productQueries';

const productIdOf = (product) => product?._id || product?.id || product?.productId || '';
const productNameOf = (product) => product?.productName || product?.productNameSnapshot || product?.name || '';

const productKeyOf = (product) => {
  const id = productIdOf(product);
  if (id) return `id:${id}`;

  const name = productNameOf(product).trim().toLowerCase();
  if (!name) return '';

  const company = product?.companyId?._id || product?.companyId || product?.company || '';
  const mrp = product?.mrp ?? product?.mrpSnapshot ?? '';
  return `snapshot:${company}:${name}:${mrp}`;
};

const hasProductIdentity = (product) => Boolean(productKeyOf(product));

const normalizeProduct = (product = {}) => ({
  ...product,
  _id: productIdOf(product),
  productId: productIdOf(product),
  name: productNameOf(product),
  productName: productNameOf(product),
  productNameSnapshot: productNameOf(product),
  mrp: Number(product.mrp ?? product.mrpSnapshot ?? 0),
});

const mergeProducts = (existing, incoming) => {
  const byId = new Map();
  [...existing, ...incoming].forEach((product) => {
    if (!hasProductIdentity(product)) return;
    const normalized = normalizeProduct(product);
    byId.set(productKeyOf(normalized), normalized);
  });
  return [...byId.values()];
};

const SearchableProductDropdown = ({
  value,
  onChange,
  companyId,
  disabled = false,
  placeholder = 'Search Product...',
  label = 'Product Name',
  error = false,
  helperText = '',
  required = false,
  size = 'small',
  selectedProduct = null,
  limit = 25,
}) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');
  const debounceRef = useRef(null);
  const searchParams = useMemo(() => ({
    companyId: companyId || '',
    q: query,
    limit,
  }), [companyId, limit, query]);
  const searchQueryKey = useMemo(() => productQueryKeys.search(searchParams), [searchParams]);

  const {
    data,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: searchQueryKey,
    queryFn: ({ pageParam = 1, signal }) => productService.searchProducts({
      q: query,
      page: pageParam,
      limit,
      ...(companyId && { companyId }),
    }, signal),
    enabled: open && !disabled,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const payload = lastPage?.data || {};
      return payload.hasMore ? Number(payload.page || 1) + 1 : undefined;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  });

  const fetchedOptions = useMemo(() => (
    data?.pages?.flatMap((pageData) => (pageData.data?.items || pageData.items || []).map(normalizeProduct)) || []
  ), [data]);

  const options = useMemo(() => mergeProducts([selectedProduct], fetchedOptions), [fetchedOptions, selectedProduct]);

  const loading = isLoading || (isFetching && !isFetchingNextPage);
  const loadError = queryError?.response?.data?.message || queryError?.message || '';

  const selected = useMemo(() => {
    const selectedId = String(value || productIdOf(selectedProduct) || '');
    if (selectedId) {
      return options.find((product) => String(productIdOf(product)) === selectedId)
        || (hasProductIdentity(selectedProduct) ? normalizeProduct(selectedProduct) : null);
    }
    return hasProductIdentity(selectedProduct) ? normalizeProduct(selectedProduct) : null;
  }, [options, selectedProduct, value]);

  useEffect(() => {
    if (open) return;
    const selectedName = productNameOf(selectedProduct);
    if (selectedName) setInputValue(selectedName);
    if (!value && !selectedName) setInputValue('');
  }, [open, selectedProduct, value]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(inputValue.trim());
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [inputValue]);

  useEffect(() => () => {
    clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    if (open && !disabled) refetch();
  }, [disabled, open, query, companyId, limit, refetch]);

  const handleOpen = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: searchQueryKey, refetchType: 'none' });
    setOpen(true);
  }, [queryClient, searchQueryKey]);

  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleScroll = useCallback((event) => {
    const node = event.currentTarget;
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - 32) loadMore();
  }, [loadMore]);

  const handleChange = useCallback((event, product) => {
    onChange(product ? normalizeProduct(product) : null);
  }, [onChange]);

  const message = loadError || helperText;
  const noOptionsText = loading ? 'Searching products...' : loadError || 'No products found';

  return (
    <Autocomplete
      open={open}
      onOpen={handleOpen}
      onClose={() => setOpen(false)}
      value={selected}
      inputValue={inputValue}
      options={options}
      loading={loading}
      disabled={disabled}
      filterOptions={(items) => items}
      getOptionLabel={(option) => productNameOf(option)}
      isOptionEqualToValue={(option, current) => String(productIdOf(option)) === String(productIdOf(current))}
      renderOption={(props, option) => (
        <li {...props} title={productNameOf(option)}>
          {productNameOf(option)}
        </li>
      )}
      onInputChange={(event, nextValue, reason) => {
        setInputValue(nextValue);
      }}
      onChange={handleChange}
      disablePortal={false}
      loadingText="Searching products..."
      noOptionsText={noOptionsText}
      ListboxProps={{ onScroll: handleScroll }}
      slotProps={{
        popper: {
          sx: { zIndex: (theme) => theme.zIndex.modal + 1 },
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          size={size}
          error={Boolean(error || loadError)}
          helperText={message}
          inputProps={{
            ...params.inputProps,
            title: inputValue || productNameOf(selected) || '',
          }}
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

export default SearchableProductDropdown;
