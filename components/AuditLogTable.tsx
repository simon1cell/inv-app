"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ScrollText } from "lucide-react";

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

import type { AuditLog } from "@/types/inventory";

const PAGE_SIZE = 8;
type SortKey = "timestamp" | "username" | "action" | "changeAmount";

const ACTION_LABELS: Record<string, string> = {
  CREATE_ITEM: "Created Item",
  UPDATE_ITEM: "Updated Item",
  DELETE_ITEM: "Deleted Item",
  ITEM_COMMENT: "Item Comment",
  DELETE_ITEM_COMMENT: "Deleted Item Comment",
  TRANSACTION: "Inventory Transaction",
  DELETE_ORDER_DOCUMENT: "Deleted Order Document",
  CREATE_ORDER: "Created Order",
  IMPORT_ORDERS: "Imported Orders",
  AI_IMPORT_ORDERS: "AI Imported Orders",
  UPLOAD_ORDER_DOCUMENT: "Uploaded Order Document",
  ORDER_CONFIRMED: "Order Confirmed",
  ORDER_DELIVERED: "Order Delivered",
  ORDER_PAID: "Order Paid",
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

function formatChange(value: number | null) {
  if (value === null) return "—";
  return value > 0 ? `+${value}` : value;
}

type AuditLogTableProps = { logs: AuditLog[] };

export default function AuditLogTable({ logs }: AuditLogTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const { sort, toggleSort } = useSortable<SortKey>("timestamp");

  const sorted = useMemo(() => {
    return [...logs].sort((a, b) => {
      const dir = sort.direction === "asc" ? 1 : -1;
      switch (sort.key) {
        case "timestamp":    return a.timestamp.localeCompare(b.timestamp) * dir;
        case "username":     return a.username.localeCompare(b.username) * dir;
        case "action":       return a.action.localeCompare(b.action) * dir;
        case "changeAmount": return ((a.changeAmount ?? 0) - (b.changeAmount ?? 0)) * dir;
        default:             return b.timestamp.localeCompare(a.timestamp);
      }
    });
  }, [logs, sort]);

  useEffect(() => { setCurrentPage(1); }, [sort.key, sort.direction]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleLogs = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <section className="view active">
      <div className="page-header">
        <div>
          <h2 className="page-title">Audit Log</h2>
          <p className="page-sub">Inventory and order actions recorded by the system.</p>
        </div>
      </div>

      <div className="card">
        <div className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader label="Time"    sortKey="timestamp"    sort={sort} onSort={toggleSort} />
                <SortableHeader label="User"    sortKey="username"     sort={sort} onSort={toggleSort} />
                <SortableHeader label="Action"  sortKey="action"       sort={sort} onSort={toggleSort} />
                <TableHead>Item ID</TableHead>
                <TableHead>Old Qty</TableHead>
                <SortableHeader label="Change"  sortKey="changeAmount" sort={sort} onSort={toggleSort} />
                <TableHead>New Qty</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {visibleLogs.map((log, index) => (
                <motion.tr
                  key={log.id}
                  className="border-b transition-colors hover:bg-muted/40"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.025, duration: 0.18 }}
                >
                  <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell>{log.username}</TableCell>
                  <TableCell>
                    <div className="audit-action">
                      <strong>{actionLabel(log.action)}</strong>
                      <code>{log.action}</code>
                    </div>
                  </TableCell>
                  <TableCell>{log.itemId ?? "—"}</TableCell>
                  <TableCell>{log.oldQuantity ?? "—"}</TableCell>
                  <TableCell>{formatChange(log.changeAmount)}</TableCell>
                  <TableCell>{log.newQuantity ?? "—"}</TableCell>
                  <TableCell>{log.details ?? "—"}</TableCell>
                </motion.tr>
              ))}

              {visibleLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="empty-row">
                    No audit entries found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <TablePaginator
          page={safePage}
          totalPages={totalPages}
          totalItems={sorted.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </section>
  );
}