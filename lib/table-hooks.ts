import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export type SortState<K extends string> = {
  key: K | null;
  direction: SortDirection;
};

export function useSortable<K extends string>(defaultKey: K | null = null) {
  const [sort, setSort] = useState<SortState<K>>({
    key: defaultKey,
    direction: "asc",
  });

  function toggleSort(key: K) {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  }

  return { sort, toggleSort };
}

export function usePagination(totalItems: number, pageSize = 8) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => ({ start: (safePage - 1) * pageSize, end: safePage * pageSize }),
    [safePage, pageSize],
  );

  function goTo(p: number) {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }

  // Reset to page 1 if filters change total
  function resetPage() {
    setPage(1);
  }

  return { page: safePage, totalPages, pageItems, goTo, resetPage };
}
