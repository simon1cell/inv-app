"use client";

import { useMemo, useState } from "react";

import StatusBadge from "@/components/StatusBadge";
import {
  emojiFor,
  type InventoryItem,
  type ItemType,
  type Status,
} from "@/types/inventory";

type StockItemsTableProps = {
  items: InventoryItem[];
  itemTypes: ItemType[];
  isAdmin: boolean;
  commentCountsByItemId: Record<string, number>;
  onAddItem: () => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onViewComments: (item: InventoryItem) => void;
  onUseItem: (itemId: string, amount: number) => Promise<void>;
  onRestockItem: (itemId: string, amount: number) => Promise<void>;
};

type FilterValue = Extract<Status, "low" | "critical" | "out">;
type StockSort =
  | "name"
  | "quantity-low"
  | "quantity-high"
  | "catalog"
  | "storage";

const FILTERS: Array<{ label: string; value: FilterValue }> = [
  { label: "Low", value: "low" },
  { label: "Critical", value: "critical" },
  { label: "Out of Stock", value: "out" },
];

export default function StockItemsTable({
  items,
  itemTypes,
  isAdmin,
  commentCountsByItemId,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onViewComments,
  onUseItem,
  onRestockItem,
}: StockItemsTableProps) {
  const [filters, setFilters] = useState<FilterValue[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<StockSort>("name");
  const [amountsByItemId, setAmountsByItemId] = useState<Record<string, string>>(
    {},
  );
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const itemTypeById = useMemo(() => {
    return new Map(itemTypes.map((itemType) => [itemType.id, itemType]));
  }, [itemTypes]);

  function toggleFilter(value: FilterValue) {
    setFilters((current) =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    );
  }

  function amountFor(itemId: string) {
    return amountsByItemId[itemId] ?? "1";
  }

  function updateAmount(itemId: string, value: string) {
    setAmountsByItemId((current) => ({
      ...current,
      [itemId]: value,
    }));
  }

  function parsedAmount(itemId: string) {
    const amount = Number(amountFor(itemId));

    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    return Math.floor(amount);
  }

  async function handleUse(item: InventoryItem) {
    const amount = parsedAmount(item.id);

    if (!amount) {
      window.alert("Enter an amount greater than 0.");
      return;
    }

    setBusyItemId(item.id);

    try {
      await onUseItem(item.id, amount);
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleRestock(item: InventoryItem) {
    const amount = parsedAmount(item.id);

    if (!amount) {
      window.alert("Enter an amount greater than 0.");
      return;
    }

    setBusyItemId(item.id);

    try {
      await onRestockItem(item.id, amount);
    } finally {
      setBusyItemId(null);
    }
  }

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...items]
      .filter((item) => {
        const itemType = item.itemTypeId
          ? itemTypeById.get(item.itemTypeId)
          : null;

        const matchesFilter =
          filters.length === 0 || filters.includes(item.status as FilterValue);

        const searchText = [
          item.itemName,
          itemType?.name,
          item.category,
          item.brand,
          item.catalogueNum,
          item.lotNum,
          item.shelfNum,
          item.storageId,
          item.quantity,
          item.expiryDate,
          item.tags.join(" "),
        ]
          .filter((value) => value !== null && value !== undefined)
          .join(" ")
          .toLowerCase();

        return matchesFilter && searchText.includes(query);
      })
      .sort((a, b) => {
        if (sort === "quantity-low") return a.quantity - b.quantity;
        if (sort === "quantity-high") return b.quantity - a.quantity;
        if (sort === "catalog") return a.catalogueNum.localeCompare(b.catalogueNum);
        if (sort === "storage") return a.storageId.localeCompare(b.storageId);
        return a.itemName.localeCompare(b.itemName);
      });
  }, [filters, itemTypeById, items, search, sort]);

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>Stock Items</h2>
          <p className="sub">
            Individual catalog, lot, storage, and quantity records
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
            placeholder="Search stock items"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          className="select-control"
          value={sort}
          onChange={(event) => setSort(event.target.value as StockSort)}
        >
          <option value="name">Name</option>
          <option value="catalog">Catalog Number</option>
          <option value="storage">Storage</option>
          <option value="quantity-low">Quantity: Low to High</option>
          <option value="quantity-high">Quantity: High to Low</option>
        </select>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Stock Item</th>
              <th>Item Type</th>
              <th>Catalog #</th>
              <th>Brand</th>
              <th>Lot #</th>
              <th>Storage</th>
              <th>Shelf</th>
              <th>Qty</th>
              <th>Use / Restock</th>
              <th>Expiry</th>
              <th>Status</th>
              <th>Comments</th>
              {isAdmin && <th />}
            </tr>
          </thead>

          <tbody>
            {visibleItems.map((item, index) => {
              const itemType = item.itemTypeId
                ? itemTypeById.get(item.itemTypeId)
                : null;

              const commentCount = commentCountsByItemId[item.id] ?? 0;
              const busy = busyItemId === item.id;

              return (
                <tr key={item.id}>
                  <td className="strong-text">{index + 1}</td>

                  <td>
                    <div className="item-cell">
                      <div className="thumb">{emojiFor(item.itemName)}</div>
                      <div>
                        <div className="nm">{item.itemName}</div>
                        <div className="sub">{item.catalogueNum}</div>
                      </div>
                    </div>
                  </td>

                  <td>{itemType?.name ?? "Unlinked"}</td>
                  <td>{item.catalogueNum}</td>
                  <td>{item.brand}</td>
                  <td>{item.lotNum}</td>
                  <td>{item.storageId}</td>
                  <td>{item.shelfNum}</td>
                  <td className="strong-text">{item.quantity}</td>

                  <td>
                    <div className="stock-action-cell">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={amountFor(item.id)}
                        onChange={(event) =>
                          updateAmount(item.id, event.target.value)
                        }
                      />

                      <button
                        type="button"
                        className="mini-btn danger"
                        disabled={busy || item.quantity <= 0}
                        onClick={() => void handleUse(item)}
                      >
                        Use
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          className="mini-btn good"
                          disabled={busy}
                          onClick={() => void handleRestock(item)}
                        >
                          Restock
                        </button>
                      )}
                    </div>
                  </td>

                  <td>{item.expiryDate}</td>

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
                          title="Edit stock item"
                          onClick={() => onEditItem(item)}
                        >
                          ✎
                        </button>

                        <button
                          type="button"
                          className="icon-btn del"
                          title="Archive stock item"
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
                <td colSpan={isAdmin ? 14 : 13} className="empty-row">
                  No stock items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
