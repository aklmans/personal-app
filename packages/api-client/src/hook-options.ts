import type { QueryKey, UseQueryOptions } from "@tanstack/react-query";

/**
 * Helper to pass partial query options to generated hooks.
 * The generated hooks compute queryKey internally; this allows omitting it at call sites
 * while still type-checking all other options against UseQueryOptions.
 */
export function queryOpts<
  TData = unknown,
  TError = unknown,
  TSelectData = TData,
  TQueryKey extends QueryKey = QueryKey,
>(
  opts: Omit<UseQueryOptions<TData, TError, TSelectData, TQueryKey>, "queryKey">,
): UseQueryOptions<TData, TError, TSelectData, TQueryKey> {
  return opts as UseQueryOptions<TData, TError, TSelectData, TQueryKey>;
}
