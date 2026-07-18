"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SortState } from "@/lib/table-hooks";

// ─── SortableHeader ──────────────────────────────────────────────────────────

type SortableHeaderProps<K extends string> = {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  className?: string;
};

export function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: SortableHeaderProps<K>) {
  const isActive = sort.key === sortKey;

  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 font-medium text-foreground whitespace-nowrap cursor-pointer select-none hover:text-primary transition-colors"
      >
        {label}
        <span className="text-muted-foreground">
          {isActive ? (
            sort.direction === "asc" ? (
              <ChevronUp size={13} strokeWidth={2} />
            ) : (
              <ChevronDown size={13} strokeWidth={2} />
            )
          ) : (
            <ChevronsUpDown size={13} strokeWidth={2} />
          )}
        </span>
      </button>
    </th>
  );
}

// ─── TablePaginator ───────────────────────────────────────────────────────────

type TablePaginatorProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function TablePaginator({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: TablePaginatorProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-2 py-3 border-t border-border/60">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
        <span className="font-medium text-foreground">{totalItems}</span>
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} strokeWidth={2} />
        </Button>

        <div className="flex items-center gap-0.5">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const isCurrentPage = p === page;
            const isNear =
              p === 1 || p === totalPages || Math.abs(p - page) <= 1;
            const isEllipsisBefore =
              p === page - 2 && page - 2 > 1;
            const isEllipsisAfter =
              p === page + 2 && page + 2 < totalPages;

            if (isEllipsisBefore || isEllipsisAfter) {
              return (
                <span key={p} className="px-1 text-xs text-muted-foreground">
                  …
                </span>
              );
            }

            if (!isNear) return null;

            return (
              <AnimatePresence key={p} mode="wait">
                <motion.button
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`h-7 min-w-[28px] px-2 rounded-md text-xs font-medium transition-colors ${
                    isCurrentPage
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  whileTap={{ scale: 0.92 }}
                >
                  {p}
                </motion.button>
              </AnimatePresence>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={15} strokeWidth={2} />
        </Button>
      </div>
    </div>
  );
}
