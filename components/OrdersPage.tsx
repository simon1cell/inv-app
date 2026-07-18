"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, RefreshCw, Download, Upload, Truck, CreditCard, FileText, X, Trash2 } from "lucide-react";

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

import type {
  InventoryItem,
  OrderDocumentType,
  OrderDocument,
  OrderRecord,
} from "@/types/inventory";

const PAGE_SIZE = 8;

type OrderView = "active" | "log" | "all";
type SortKey =
  | "date" | "vendor" | "category" | "catalog" | "itemName"
  | "units" | "total" | "final" | "expectedDelivery" | "deliveryDate" | "status";

type OrdersPageProps = {
  orders: OrderRecord[];
  inventoryItems: InventoryItem[];
  loading: boolean;
  onRefresh: () => void;
  onAddOrder: () => void;
  onAddOrderFromInventory: (item: InventoryItem) => void;
  onImportExcel: (file: File) => Promise<void>;
  onExportAll: () => Promise<void>;
  onExportSelected: (ids: number[]) => Promise<void>;
  onUploadDocument: (
    orderId: number,
    documentType: OrderDocumentType,
    file: File,
  ) => Promise<void>;
  onGetDocuments: (orderId: number) => Promise<OrderDocument[]>;
  onDownloadDocument: (documentId: number, filename: string) => Promise<void>;
  onDeleteDocument: (documentId: number) => Promise<void>;
  onMarkDelivered: (orderId: number) => Promise<void>;
  onMarkPaid: (orderId: number) => Promise<void>;
};

function money(value: number | null) {
  if (value === null || value === undefined) return "—";
  return `$${value.toFixed(2)}`;
}

function text(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "—" : value;
}

function isDeliveredOrder(order: OrderRecord) {
  const status = (order.status || "").toLowerCase();
  return Boolean(order.deliveryDate) || status === "delivered";
}

export default function OrdersPage({
  orders,
  inventoryItems,
  loading,
  onRefresh,
  onAddOrder,
  onAddOrderFromInventory,
  onImportExcel,
  onExportAll,
  onExportSelected,
  onUploadDocument,
  onMarkDelivered,
  onMarkPaid,
  onGetDocuments,
  onDownloadDocument,
  onDeleteDocument,
}: OrdersPageProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [orderView, setOrderView] = useState<OrderView>("active");
  const [importing, setImporting] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  const { sort, toggleSort } = useSortable<SortKey>("date");

  const [pendingUpload, setPendingUpload] = useState<{
    orderId: number;
    documentType: OrderDocumentType;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);

  const activeOrderCatalogs = useMemo(
    () =>
      new Set(
        orders
          .filter((o) => !isDeliveredOrder(o))
          .map((o) => o.catalogNo?.toLowerCase())
          .filter(Boolean) as string[],
      ),
    [orders],
  );

  const suggestedItems = useMemo(
    () =>
      inventoryItems
        .filter((item) => ["low", "critical", "out"].includes(item.status))
        .filter((item) => !activeOrderCatalogs.has(item.catalogueNum.toLowerCase()))
        .slice(0, 10),
    [activeOrderCatalogs, inventoryItems],
  );

  const filtered = useMemo(() => {
    const query = search.toLowerCase();

    return orders
      .filter((order) => {
        if (orderView === "active") return !isDeliveredOrder(order);
        if (orderView === "log") return isDeliveredOrder(order);
        return true;
      })
      .filter((order) =>
        [order.vendor, order.category, order.catalogNo, order.itemName, order.poNumber, order.orderNumber, order.status]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .sort((a, b) => {
        const dir = sort.direction === "asc" ? 1 : -1;
        switch (sort.key) {
          case "date":             return (a.orderDate ?? "").localeCompare(b.orderDate ?? "") * dir;
          case "vendor":           return (a.vendor ?? "").localeCompare(b.vendor ?? "") * dir;
          case "category":         return (a.category ?? "").localeCompare(b.category ?? "") * dir;
          case "catalog":          return (a.catalogNo ?? "").localeCompare(b.catalogNo ?? "") * dir;
          case "itemName":         return a.itemName.localeCompare(b.itemName) * dir;
          case "units":            return ((a.unitsOrdered ?? 0) - (b.unitsOrdered ?? 0)) * dir;
          case "total":            return ((a.totalPrice ?? 0) - (b.totalPrice ?? 0)) * dir;
          case "final":            return ((a.finalPrice ?? 0) - (b.finalPrice ?? 0)) * dir;
          case "expectedDelivery": return (a.expectedDeliveryDate ?? "").localeCompare(b.expectedDeliveryDate ?? "") * dir;
          case "deliveryDate":     return (a.deliveryDate ?? "").localeCompare(b.deliveryDate ?? "") * dir;
          case "status":           return (a.status ?? "").localeCompare(b.status ?? "") * dir;
          default:                 return 0;
        }
      });
  }, [orders, orderView, search, sort]);

  useEffect(() => { setCurrentPage(1); }, [orderView, search, sort.key, sort.direction]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleOrders = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeCount = orders.filter((o) => !isDeliveredOrder(o)).length;
  const logCount = orders.filter(isDeliveredOrder).length;

  const allVisibleSelected =
    visibleOrders.length > 0 &&
    visibleOrders.every((o) => selectedIds.includes(o.id));

  useEffect(() => {
    function updateWidth() {
      setTableScrollWidth(tableRef.current?.scrollWidth || tableScrollRef.current?.scrollWidth || 0);
    }
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [visibleOrders]);

  function syncTopScroll() {
    if (!topScrollRef.current || !tableScrollRef.current) return;
    tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
  }
  function syncTableScroll() {
    if (!topScrollRef.current || !tableScrollRef.current) return;
    topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
  }

  const [documentModalOrderId, setDocumentModalOrderId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<OrderDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState("");
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);

  async function openDocumentsModal(orderId: number) {
    setDocumentModalOrderId(orderId);
    setDocuments([]);
    setDocumentsError("");
    setDocumentsLoading(true);
    try {
      const docs = await onGetDocuments(orderId);
      setDocuments(docs);
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setDocumentsLoading(false);
    }
  }

  function closeDocumentsModal() {
    setDocumentModalOrderId(null);
    setDocuments([]);
    setDocumentsError("");
  }

  async function handleDownloadDocument(document: OrderDocument) {
    await onDownloadDocument(document.id, document.originalFilename ?? `order-document-${document.id}`);
  }

  async function handleDeleteDocument(documentId: number) {
    if (!window.confirm("Delete this document from the server?")) return;
    setDeletingDocumentId(documentId);
    try {
      await onDeleteDocument(documentId);
      setDocuments((cur) => cur.filter((d) => d.id !== documentId));
    } finally {
      setDeletingDocumentId(null);
    }
  }

  function toggleOrder(id: number) {
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((v) => v !== id) : [...cur, id]));
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((cur) => cur.filter((id) => !visibleOrders.some((o) => o.id === id)));
      return;
    }
    setSelectedIds((cur) => {
      const next = new Set(cur);
      visibleOrders.forEach((o) => next.add(o.id));
      return Array.from(next);
    });
  }

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    try {
      await onImportExcel(file);
      setSelectedIds([]);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function openDocumentPicker(orderId: number, documentType: OrderDocumentType) {
    setPendingUpload({ orderId, documentType });
    documentInputRef.current?.click();
  }

  async function handleDocumentFileChange(file: File | undefined) {
    if (!file || !pendingUpload) return;
    setBusyOrderId(pendingUpload.orderId);
    try {
      await onUploadDocument(pendingUpload.orderId, pendingUpload.documentType, file);
    } finally {
      setBusyOrderId(null);
      setPendingUpload(null);
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  }

  async function handleMarkDelivered(orderId: number) {
    setBusyOrderId(orderId);
    try { await onMarkDelivered(orderId); } finally { setBusyOrderId(null); }
  }

  async function handleMarkPaid(orderId: number) {
    setBusyOrderId(orderId);
    try { await onMarkPaid(orderId); } finally { setBusyOrderId(null); }
  }

  return (
    <section className="view active">
      <p className="section-tag">ORDERS</p>

      {suggestedItems.length > 0 && (
        <div className="card order-suggestions">
          <div className="card-head">
            <div>
              <h2>Suggested Orders</h2>
              <p className="sub">Low, critical, or out-of-stock items without an active order</p>
            </div>
          </div>

          <div className="suggestion-list">
            {suggestedItems.map((item) => (
              <div key={item.id} className={`suggestion-row ${item.status}`}>
                <div>
                  <strong>{item.itemName}</strong>
                  <p className="sub">{item.catalogueNum} · Qty {item.quantity} · {item.status}</p>
                </div>
                <Button
                  type="button"
                  className="mini-btn good"
                  onClick={() => onAddOrderFromInventory(item)}
                  icon={Plus}
                  text="Create Order"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Orders</h2>
            <p className="sub">
              Displaying <b>{filtered.length} orders</b>
            </p>
          </div>

          <div className="order-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm"
              hidden
              onChange={(e) => void handleFileChange(e.target.files?.[0])}
            />
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xlsm,.doc,.docx"
              hidden
              onChange={(e) => void handleDocumentFileChange(e.target.files?.[0])}
            />

            <Button
              variant="default"
              size="sm"
              onClick={onAddOrder}
              icon={Plus}
              text="Add Order"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              icon={Upload}
              text={importing ? "Importing…" : "Import Excel"}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => void onExportSelected(selectedIds)}
              disabled={selectedIds.length === 0}
              icon={Download}
              text="Export Selected"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => void onExportAll()}
              icon={Download}
              text="Export All"
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              icon={RefreshCw}
              iconClass={loading ? "animate-spin" : ""}
              text={loading ? "Refreshing…" : "Refresh"}
            />
          </div>
        </div>

        <div className="toolbar">
          <div className="filters">
            <button type="button" className={orderView === "active" ? "chip active" : "chip"} onClick={() => setOrderView("active")}>
              Active Orders ({activeCount})
            </button>
            <button type="button" className={orderView === "log" ? "chip active" : "chip"} onClick={() => setOrderView("log")}>
              Order Log ({logCount})
            </button>
            <button type="button" className={orderView === "all" ? "chip active" : "chip"} onClick={() => setOrderView("all")}>
              All
            </button>
          </div>

          <div className="search">
            <span className="search-icon">
              <Search size={14} strokeWidth={2} />
            </span>
            <Input
              className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-0 pl-6"
              placeholder="Search orders"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="top-table-scroll" ref={topScrollRef} onScroll={syncTopScroll}>
          <div style={{ width: tableScrollWidth, height: 1 }} />
        </div>

        <div className="table-scroll" ref={tableScrollRef} onScroll={syncTableScroll}>
          <Table ref={tableRef}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
                </TableHead>
                <SortableHeader label="Date"              sortKey="date"             sort={sort} onSort={toggleSort} />
                <TableHead>Order Placed By</TableHead>
                <TableHead>PO Number</TableHead>
                <SortableHeader label="Vendor"            sortKey="vendor"           sort={sort} onSort={toggleSort} />
                <SortableHeader label="Category"          sortKey="category"         sort={sort} onSort={toggleSort} />
                <SortableHeader label="Catalog No."       sortKey="catalog"          sort={sort} onSort={toggleSort} />
                <SortableHeader label="Item Name"         sortKey="itemName"         sort={sort} onSort={toggleSort} />
                <SortableHeader label="# Units"           sortKey="units"            sort={sort} onSort={toggleSort} />
                <TableHead>Price / Unit</TableHead>
                <SortableHeader label="Total Price"       sortKey="total"            sort={sort} onSort={toggleSort} />
                <SortableHeader label="Final Price"       sortKey="final"            sort={sort} onSort={toggleSort} />
                <TableHead>Availability</TableHead>
                <SortableHeader label="Expected Delivery" sortKey="expectedDelivery" sort={sort} onSort={toggleSort} />
                <TableHead>Order #</TableHead>
                <SortableHeader label="Delivery Date"     sortKey="deliveryDate"     sort={sort} onSort={toggleSort} />
                <SortableHeader label="Status"            sortKey="status"           sort={sort} onSort={toggleSort} />
                <TableHead>Received By</TableHead>
                <TableHead>Date Paid</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>CC / Invoice</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {visibleOrders.map((order, index) => (
                <motion.tr
                  key={order.id}
                  className="border-b transition-colors hover:bg-muted/40"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.025, duration: 0.18 }}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(order.id)}
                      onChange={() => toggleOrder(order.id)}
                    />
                  </TableCell>

                  <TableCell>{text(order.orderDate)}</TableCell>
                  <TableCell>{text(order.orderPlacedBy)}</TableCell>
                  <TableCell>{text(order.poNumber)}</TableCell>
                  <TableCell>{text(order.vendor)}</TableCell>
                  <TableCell>{text(order.category)}</TableCell>
                  <TableCell>{text(order.catalogNo)}</TableCell>
                  <TableCell className="strong-text">{order.itemName}</TableCell>
                  <TableCell>{text(order.unitsOrdered)}</TableCell>
                  <TableCell>{money(order.pricePerUnit)}</TableCell>
                  <TableCell>{money(order.totalPrice)}</TableCell>
                  <TableCell>{money(order.finalPrice)}</TableCell>
                  <TableCell>{text(order.availability)}</TableCell>
                  <TableCell>{text(order.expectedDeliveryDate)}</TableCell>
                  <TableCell>{text(order.orderNumber)}</TableCell>
                  <TableCell>{text(order.deliveryDate)}</TableCell>
                  <TableCell>{text(order.status)}</TableCell>
                  <TableCell>{text(order.receivedBy)}</TableCell>
                  <TableCell>{text(order.datePaid)}</TableCell>
                  <TableCell>{money(order.amountPaid)}</TableCell>
                  <TableCell>{text(order.ccInvoice)}</TableCell>

                  <TableCell>
                    <div className="order-row-actions">
                      <Button
                        type="button"
                        className="mini-btn"
                        disabled={busyOrderId === order.id}
                        onClick={() => openDocumentPicker(order.id, "confirmation")}
                        icon={Upload}
                        text="Confirmation"
                      />
                      <Button
                        type="button"
                        className="mini-btn"
                        onClick={() => void openDocumentsModal(order.id)}
                        icon={FileText}
                        text="View Docs"
                      />
                      <Button
                        type="button"
                        className="mini-btn"
                        disabled={busyOrderId === order.id}
                        onClick={() => openDocumentPicker(order.id, "invoice")}
                        icon={Upload}
                        text="Invoice"
                      />
                      <Button
                        type="button"
                        className="mini-btn"
                        disabled={busyOrderId === order.id}
                        onClick={() => openDocumentPicker(order.id, "delivery")}
                        icon={Upload}
                        text="Delivery Doc"
                      />
                      <Button
                        type="button"
                        className="mini-btn good"
                        disabled={busyOrderId === order.id}
                        onClick={() => void handleMarkDelivered(order.id)}
                        icon={Truck}
                        text="Delivered"
                      />
                      <Button
                        type="button"
                        className="mini-btn paid"
                        disabled={busyOrderId === order.id}
                        onClick={() => void handleMarkPaid(order.id)}
                        icon={CreditCard}
                        text="Paid"
                      />
                    </div>
                  </TableCell>
                </motion.tr>
              ))}

              {visibleOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={22} className="empty-row">
                    {loading ? "Loading orders…" : "No orders found."}
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

      {documentModalOrderId !== null && (
        <div className="modal-backdrop" onClick={closeDocumentsModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>Order Documents</h2>
                <p className="sub">Order #{documentModalOrderId}</p>
              </div>
              <motion.button
                type="button"
                className="icon-btn"
                onClick={closeDocumentsModal}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
              >
                <X size={15} strokeWidth={2} />
              </motion.button>
            </div>

            {documentsLoading && <p className="modal-message">Loading documents…</p>}
            {documentsError && <p className="error-message">{documentsError}</p>}
            {!documentsLoading && !documentsError && documents.length === 0 && (
              <p className="modal-message">No documents uploaded for this order.</p>
            )}

            {!documentsLoading && documents.length > 0 && (
              <div className="document-list">
                {documents.map((document) => (
                  <div key={document.id} className="document-row">
                    <div>
                      <strong>{document.originalFilename ?? `order-document-${document.id}`}</strong>
                      <p className="sub">
                        {document.documentType} · {new Date(document.receivedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="document-actions">
                      <Button
                        type="button"
                        className="mini-btn"
                        onClick={() => void handleDownloadDocument(document)}
                        icon={Download}
                        text="Download"
                      />
                      <Button
                        type="button"
                        className="mini-btn danger"
                        disabled={deletingDocumentId === document.id}
                        onClick={() => void handleDeleteDocument(document.id)}
                        icon={Trash2}
                        text={deletingDocumentId === document.id ? "Deleting…" : "Delete"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}