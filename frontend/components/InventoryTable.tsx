"use client";

import { useMemo, useState } from "react";

import StatusBadge from "@/components/StatusBadge";
import { emojiFor, type ItemType, type Status } from "@/types/inventory";

type InventoryTableProps = {
  items: ItemType[];
  isAdmin: boolean;
  commentCountsByItemTypeId: Record<number, number>;
  onAddItem: () => void;
  onEditItem: (item: ItemType) => void;
  onDeleteItem: (itemId: number) => void;
  onViewComments: (item: ItemType) => void;
};

type FilterValue = Extract<Status, "low" | "critical" | "out">;
type InventorySort = "name" | "quantity-low" | "quantity-high";

const FILTERS: Array<{ label: string; value: FilterValue }> = [
  { label: "Low", value: "low" },
  { label: "Critical", value: "critical" },
  { label: "Out of Stock", value: "out" },
];

export default function InventoryTable({
  items,
  isAdmin,
  commentCountsByItemTypeId,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onViewComments,
}: InventoryTableProps) {
  const [filters, setFilters] = useState<FilterValue[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<InventorySort>("name");

  function toggleFilter(value: FilterValue) {
    setFilters((current) =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    );
  }

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...items]
      .filter((item) => {
        const matchesFilter =
          filters.length === 0 || filters.includes(item.status as FilterValue);

        const searchText = [
          item.name,
          item.category,
          item.brand,
          item.totalQuantity,
        ]
          .filter((value) => value !== null && value !== undefined)
          .join(" ")
          .toLowerCase();

        return matchesFilter && searchText.includes(query);
      })
      .sort((a, b) => {
        if (sort === "quantity-low") return a.totalQuantity - b.totalQuantity;
        if (sort === "quantity-high") return b.totalQuantity - a.totalQuantity;
        return a.name.localeCompare(b.name);
      });
  }, [filters, items, search, sort]);

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>Item Types</h2>
          <p className="sub">
            Aggregated inventory across <b>{visibleItems.length} item types</b>
          </p>
        </div>

        {isAdmin && (
          <button type="button" className="btn primary" onClick={onAddItem}>
            + Add Stock Item
          </button>
        )}
      </div>

      <div className="toolbar">
        <div className="filters">
          <button
            type="button"
            className={filters.length === 0 ? "chip active" : "chip"}
            onClick={() => setFilters([])}
          >
            Everything
          </button>

          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={filters.includes(option.value) ? "chip active" : "chip"}
              onClick={() => toggleFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="search">
          <span className="search-icon">⌕</span>
          <input
            placeholder="Search item types"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          className="select-control"
          value={sort}
          onChange={(event) => setSort(event.target.value as InventorySort)}
        >
          <option value="name">Name</option>
          <option value="quantity-low">Quantity: Low to High</option>
          <option value="quantity-high">Quantity: High to Low</option>
        </select>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Item Type</th>
              <th>Category</th>
              <th>Active Brands</th>
              <th>Total Qty</th>
              <th>Status</th>
              <th>Comments</th>
              {isAdmin && <th />}
            </tr>
          </thead>

          <tbody>
            {visibleItems.map((item, index) => {
              const commentCount = commentCountsByItemTypeId[item.id] ?? 0;

              return (
                <tr key={item.id}>
                  <td className="strong-text">{index + 1}</td>

                  <td>
                    <div className="item-cell">
                      <div className="thumb">{emojiFor(item.name)}</div>
                      <div>
                        <div className="nm">{item.name}</div>
                        {item.category && <div className="sub">{item.category}</div>}
                      </div>
                    </div>
                  </td>

                  <td>{item.category ?? "Uncategorized"}</td>
                  <td>{item.brand ?? "—"}</td>
                  <td className="strong-text">{item.totalQuantity}</td>

                  <td>
                    <StatusBadge status={item.status} />
                  </td>

                  <td>
                    <button
                      type="button"
                      className={
                        commentCount > 0
                          ? "comment-chip has-comments"
                          : "comment-chip"
                      }
                      onClick={() => onViewComments(item)}
                    >
                      💬 {commentCount}
                    </button>
                  </td>

                  {isAdmin && (
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Edit item type"
                          onClick={() => onEditItem(item)}
                        >
                          ✎
                        </button>

                        <button
                          type="button"
                          className="icon-btn del"
                          title="Delete item type"
                          onClick={() => onDeleteItem(item.id)}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}

            {visibleItems.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="empty-row">
                  No inventory item types found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
