import { useInfiniteQuery } from "@tanstack/react-query";
import { listBlogPosts } from "@workspace/api-client-react";

export interface PaginatedPostsParams {
  locale?: string;
  category?: string;
  tag?: string;
  series?: string;
  limit?: number;
}

export function usePaginatedPosts(params: PaginatedPostsParams) {
  const limit = params.limit ?? 20;

  return useInfiniteQuery({
    queryKey: ["/api/blog/posts", params],
    queryFn: ({ pageParam }) =>
      listBlogPosts({
        locale: params.locale as "en" | "zh-cn" | undefined,
        category: params.category,
        tag: params.tag,
        series: params.series,
        page: pageParam as number,
        limit,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
}
