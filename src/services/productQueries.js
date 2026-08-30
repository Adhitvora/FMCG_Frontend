export const productQueryKeys = {
  all: ['products'],
  lists: () => [...productQueryKeys.all, 'list'],
  list: (params = {}) => [...productQueryKeys.lists(), params],
  searches: () => [...productQueryKeys.all, 'search'],
  search: (params = {}) => [...productQueryKeys.searches(), params],
};

export const refreshProductQueries = async (queryClient) => {
  queryClient.removeQueries({ queryKey: productQueryKeys.searches(), type: 'inactive' });

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: productQueryKeys.lists(), refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: productQueryKeys.searches(), refetchType: 'active' }),
  ]);
};
