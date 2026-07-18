"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHeader, TablePaginator } from "@/components/ui/sortable-table";
import { useSortable } from "@/lib/table-hooks";

import StatusBadge from "@/components/StatusBadge";
import { type InventoryItem, type ItemType, type Status } from "@/types/inventory";

const PAGE_SIZE = 8;

type StockItemsTableProps = {
  items: InventoryItem[];
  itemTypes: ItemType[];
  isAdmin: boolean;
  commentCountsByItemId: Record<string, number>;
  onAddItem: () => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onViewComments: (item: InventoryItem) => void;
};

type FilterValue = Status | "everything";
type SortKey = "name" | "itemType" | "catalog" | "brand" | "lot" | "storage" | "quantity" | "expiry" | "status";

const FILTERS: Array<{ label: string; value: FilterValue }> = [
  { label: "Everything", value: "everything" },
  { label: "Low", value: "low" },
  { label: "Critical", value: "critical" },
  { label: "Out of Stock", value: "out" },
];

const STATUS_ORDER: Record<string, number> = {
  out: 0, critical: 1, low: 2, expiring: 3, transit: 4, high: 5,
};

export default function StockItemsTable({
  items,
  itemTypes,
  isAdmin,
  commentCountsByItemId,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onViewComments,
}: StockItemsTableProps) {
  const [filter, setFilter] = useState<FilterValue>("everything");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { sort, toggleSort } = useSortable<SortKey>("name");

  const itemTypeById = useMemo(
    () => new Map(itemTypes.map((t) => [t.id, t])),
    [itemTypes],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...items]
      .filter((item) => {
        const type = item.itemTypeId ? itemTypeById.get(item.itemTypeId) : null;
        const matchesFilter = filter === "everything" || item.status === filter;
        const text = [
          item.itemName, type?.name, item.category, item.brand,
          item.catalogueNum, item.lotNum, item.shelfNum, item.storageId,
          item.quantity, item.expiryDate, item.tags.join(" "),
        ].filter(Boolean).join(" ").toLowerCase();
        return matchesFilter && text.includes(query);
      })
      .sort((a, b) => {
        const dir = sort.direction === "asc" ? 1 : -1;
        const typeA = a.itemTypeId ? itemTypeById.get(a.itemTypeId) : null;
        const typeB = b.itemTypeId ? itemTypeById.get(b.itemTypeId) : null;

        switch (sort.key) {
          case "name":      return a.itemName.localeCompare(b.itemName) * dir;
          case "itemType":  return (typeA?.name ?? "").localeCompare(typeB?.name ?? "") * dir;
          case "catalog":   return a.catalogueNum.localeCompare(b.catalogueNum) * dir;
          case "brand":     return (a.brand ?? "").localeCompare(b.brand ?? "") * dir;
          case "lot":       return (a.lotNum ?? "").localeCompare(b.lotNum ?? "") * dir;
          case "storage":   return a.storageId.localeCompare(b.storageId) * dir;
          case "quantity":  return (a.quantity - b.quantity) * dir;
          case "expiry":    return (a.expiryDate ?? "").localeCompare(b.expiryDate ?? "") * dir;
          case "status":    return ((STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)) * dir;
          default:          return a.itemName.localeCompare(b.itemName);
        }
      });
  }, [filter, items, itemTypeById, search, sort]);

  useEffect(() => { setCurrentPage(1); }, [filter, search, sort.key, sort.direction]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>Stock Items</h2>
          <p className="sub">Individual catalog, lot, storage, and quantity records</p>
        </div>

        {isAdmin && (
          <Button
            size="sm"
            onClick={onAddItem}
            icon={Plus}
            text="Add Stock Item"
          />
        )}
      </div>

      <div className="toolbar">
        <div className="filters">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={filter === option.value ? "chip active" : "chip"}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="search">
          <span className="search-icon">
            <Search size={14} strokeWidth={2} />
          </span>
          <Input
            className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-0 pl-6"
            placeholder="Search stock items"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-scroll">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">No</TableHead>
              <SortableHeader label="Stock Item"  sortKey="name"     sort={sort} onSort={toggleSort} />
              <SortableHeader label="Item Type"   sortKey="itemType" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Catalog #"   sortKey="catalog"  sort={sort} onSort={toggleSort} />
              <SortableHeader label="Brand"       sortKey="brand"    sort={sort} onSort={toggleSort} />
              <SortableHeader label="Lot #"       sortKey="lot"      sort={sort} onSort={toggleSort} />
              <SortableHeader label="Storage"     sortKey="storage"  sort={sort} onSort={toggleSort} />
              <TableHead>Shelf</TableHead>
              <SortableHeader label="Qty"         sortKey="quantity" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Expiry"      sortKey="expiry"   sort={sort} onSort={toggleSort} />
              <SortableHeader label="Status"      sortKey="status"   sort={sort} onSort={toggleSort} />
              <TableHead>Comments</TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>

          <TableBody>
            {visibleItems.map((item, index) => {
              const itemType = item.itemTypeId ? itemTypeById.get(item.itemTypeId) : null;
              const commentCount = commentCountsByItemId[item.id] ?? 0;
              const absoluteIndex = (safePage - 1) * PAGE_SIZE + index + 1;

              return (
                <motion.tr
                  key={item.id}
                  className="border-b transition-colors hover:bg-muted/40"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.025, duration: 0.18 }}
                >
                  <TableCell className="strong-text">{absoluteIndex}</TableCell>

                  <TableCell>
                    <div className="item-cell">
                      <div className="thumb">
                        <FlaskConical size={16} strokeWidth={1.6} />
                      </div>
                      <div>
                        <div className="nm">{item.itemName}</div>
                        <div className="sub">{item.catalogueNum}</div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>{itemType?.name ?? "Unlinked"}</TableCell>
                  <TableCell>{item.catalogueNum}</TableCell>
                  <TableCell>{item.brand}</TableCell>
                  <TableCell>{item.lotNum}</TableCell>
                  <TableCell>{item.storageId}</TableCell>
                  <TableCell>{item.shelfNum}</TableCell>
                  <TableCell className="strong-text">{item.quantity}</TableCell>
                  <TableCell>{item.expiryDate}</TableCell>

                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>

                  <TableCell>
                    <button
                      type="button"
                      className={commentCount > 0 ? "comment-chip has-comments" : "comment-chip"}
                      onClick={() => onViewComments(item)}
                    >
                      <MessageSquare size={13} strokeWidth={1.75} />
                      {commentCount}
                    </button>
                  </TableCell>

                  {isAdmin && (
                    <TableCell>
                      <div className="row-actions">
                        <motion.button
                          type="button"
                          className="icon-btn"
                          title="Edit stock item"
                          onClick={() => onEditItem(item)}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Pencil size={14} strokeWidth={1.75} />
                        </motion.button>

                        <motion.button
                          type="button"
                          className="icon-btn del"
                          title="Archive stock item"
                          onClick={() => onDeleteItem(item.id)}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Trash2 size={14} strokeWidth={1.75} />
                        </motion.button>
                      </div>
                    </TableCell>
                  )}
                </motion.tr>
              );
            })}

            {visibleItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 13 : 12} className="empty-row">
                  No stock items found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePaginator
        page={safePage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}