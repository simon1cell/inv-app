"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  InventoryItem,
  OrderDocumentType,
  OrderDocument,
  OrderRecord,
} from "@/types/inventory";

type OrderView = "active" | "log" | "all";

type OrderUpdatePayload = {
  item_type_id?: number | null;
  order_date?: string | null;
  order_placed_by?: string | null;
  po_number?: string | null;
  vendor?: string | null;
  category?: string | null;
  catalog_no?: string | null;
  item_name?: string;
  units_ordered?: number | null;
  price_per_unit?: number | null;
  total_price?: number | null;
  final_price?: number | null;
  availability?: string | null;
  expected_delivery_date?: string | null;
  order_number?: string | null;
  delivery_date?: string | null;
  status?: string;
  received_by?: string | null;
  date_paid?: string | null;
  amount_paid?: number | null;
  cc_invoice?: string | null;
};

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
  onUpdateOrder: (orderId: number, payload: OrderUpdatePayload) => Promise<void>;
  onDeleteOrder: (orderId: number) => Promise<void>;
};

function money(value: number | null) {
  if (value === null || value === undefined) return "—";
  return `$${value.toFixed(2)}`;
}

function text(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "—" : value;
}

function dateValue(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function numberValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function nullableNumber(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nullableText(value: string) {
  const clean = value.trim();
  return clean ? clean : null;
}

function isDeliveredOrder(order: OrderRecord) {
  const status = (order.status || "").toLowerCase();
  return Boolean(order.deliveryDate) || status === "delivered";
}

function isPaidOrder(order: OrderRecord) {
  const status = (order.status || "").toLowerCase();
  return Boolean(order.datePaid) || status === "paid";
}

function isLockedOrder(order: OrderRecord) {
  return isDeliveredOrder(order) || isPaidOrder(order);
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
  onUpdateOrder,
  onDeleteOrder,
  onGetDocuments,
  onDownloadDocument,
  onDeleteDocument,
}: OrdersPageProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [orderView, setOrderView] = useState<OrderView>("active");
  const [importing, setImporting] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  const [pendingUpload, setPendingUpload] = useState<{
    orderId: number;
    documentType: OrderDocumentType;
  } | null>(null);

  const [documentModalOrderId, setDocumentModalOrderId] = useState<number | null>(
    null,
  );
  const [documents, setDocuments] = useState<OrderDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState("");
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(
    null,
  );

  const [editingOrder, setEditingOrder] = useState<OrderRecord | null>(null);
  const [editForm, setEditForm] = useState({
    orderDate: "",
    orderPlacedBy: "",
    poNumber: "",
    vendor: "",
    category: "",
    catalogNo: "",
    itemName: "",
    unitsOrdered: "",
    pricePerUnit: "",
    totalPrice: "",
    finalPrice: "",
    availability: "",
    expectedDeliveryDate: "",
    orderNumber: "",
    status: "Ordered",
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);

  const activeOrderCatalogs = useMemo(() => {
    return new Set(
      orders
        .filter((order) => !isDeliveredOrder(order))
        .map((order) => order.catalogNo?.toLowerCase())
        .filter(Boolean) as string[],
    );
  }, [orders]);

  const suggestedItems = useMemo(() => {
    return inventoryItems
      .filter((item) => ["low", "critical", "out"].includes(item.status))
      .filter(
        (item) => !activeOrderCatalogs.has(item.catalogueNum.toLowerCase()),
      )
      .slice(0, 10);
  }, [activeOrderCatalogs, inventoryItems]);

  const pendingDeliveryOrders = useMemo(() => {
    return orders.filter((order) => !isDeliveredOrder(order));
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const query = search.toLowerCase();

    return orders
      .filter((order) => {
        if (orderView === "active") return !isDeliveredOrder(order);
        if (orderView === "log") return isDeliveredOrder(order);
        return true;
      })
      .filter((order) =>
        [
          order.vendor,
          order.category,
          order.catalogNo,
          order.itemName,
          order.poNumber,
          order.orderNumber,
          order.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
  }, [orders, orderView, search]);

  const activeCount = orders.filter((order) => !isDeliveredOrder(order)).length;
  const logCount = orders.filter(isDeliveredOrder).length;

  const allVisibleSelected =
    visibleOrders.length > 0 &&
    visibleOrders.every((order) => selectedIds.includes(order.id));

  useEffect(() => {
    function updateWidth() {
      setTableScrollWidth(
        tableRef.current?.scrollWidth ||
          tableScrollRef.current?.scrollWidth ||
          0,
      );
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

  function toggleOrder(id: number) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !visibleOrders.some((order) => order.id === id)),
      );
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);

      visibleOrders.forEach((order) => {
        next.add(order.id);
      });

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

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function openDocumentPicker(
    orderId: number,
    documentType: OrderDocumentType,
  ) {
    setPendingUpload({ orderId, documentType });
    documentInputRef.current?.click();
  }

  async function handleDocumentFileChange(file: File | undefined) {
    if (!file || !pendingUpload) return;

    setBusyOrderId(pendingUpload.orderId);

    try {
      await onUploadDocument(
        pendingUpload.orderId,
        pendingUpload.documentType,
        file,
      );
    } finally {
      setBusyOrderId(null);
      setPendingUpload(null);

      if (documentInputRef.current) {
        documentInputRef.current.value = "";
      }
    }
  }

  async function openDocumentsModal(orderId: number) {
    setDocumentModalOrderId(orderId);
    setDocuments([]);
    setDocumentsError("");
    setDocumentsLoading(true);

    try {
      const docs = await onGetDocuments(orderId);
      setDocuments(docs);
    } catch (err) {
      setDocumentsError(
        err instanceof Error ? err.message : "Failed to load documents",
      );
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
    await onDownloadDocument(
      document.id,
      document.originalFilename ?? `order-document-${document.id}`,
    );
  }

  async function handleDeleteDocument(documentId: number) {
    if (!window.confirm("Delete this document from the server?")) return;

    setDeletingDocumentId(documentId);

    try {
      await onDeleteDocument(documentId);
      setDocuments((current) =>
        current.filter((document) => document.id !== documentId),
      );
    } finally {
      setDeletingDocumentId(null);
    }
  }

  async function handleMarkDelivered(orderId: number) {
    setBusyOrderId(orderId);

    try {
      await onMarkDelivered(orderId);
    } finally {
      setBusyOrderId(null);
    }
  }

  async function handleMarkPaid(orderId: number) {
    setBusyOrderId(orderId);

    try {
      await onMarkPaid(orderId);
    } finally {
      setBusyOrderId(null);
    }
  }

  function openEditOrder(order: OrderRecord) {
    if (isLockedOrder(order)) return;

    setEditingOrder(order);
    setEditForm({
      orderDate: dateValue(order.orderDate),
      orderPlacedBy: order.orderPlacedBy ?? "",
      poNumber: order.poNumber ?? "",
      vendor: order.vendor ?? "",
      category: order.category ?? "",
      catalogNo: order.catalogNo ?? "",
      itemName: order.itemName,
      unitsOrdered: numberValue(order.unitsOrdered),
      pricePerUnit: numberValue(order.pricePerUnit),
      totalPrice: numberValue(order.totalPrice),
      finalPrice: numberValue(order.finalPrice),
      availability: order.availability ?? "",
      expectedDeliveryDate: dateValue(order.expectedDeliveryDate),
      orderNumber: order.orderNumber ?? "",
      status: order.status || "Ordered",
    });
  }

  async function handleSaveEditedOrder() {
    if (!editingOrder) return;

    setBusyOrderId(editingOrder.id);

    try {
      await onUpdateOrder(editingOrder.id, {
        order_date: editForm.orderDate || null,
        order_placed_by: nullableText(editForm.orderPlacedBy),
        po_number: nullableText(editForm.poNumber),
        vendor: nullableText(editForm.vendor),
        category: nullableText(editForm.category),
        catalog_no: nullableText(editForm.catalogNo),
        item_name: editForm.itemName.trim(),
        units_ordered: nullableNumber(editForm.unitsOrdered),
        price_per_unit: nullableNumber(editForm.pricePerUnit),
        total_price: nullableNumber(editForm.totalPrice),
        final_price: nullableNumber(editForm.finalPrice),
        availability: nullableText(editForm.availability),
        expected_delivery_date: editForm.expectedDeliveryDate || null,
        order_number: nullableText(editForm.orderNumber),
        status: editForm.status || "Ordered",
      });

      setEditingOrder(null);
    } finally {
      setBusyOrderId(null);
    }
  }

  async function handleDeleteOrder(order: OrderRecord) {
    if (isLockedOrder(order)) return;

    const confirmed = window.confirm(
      `Delete order #${order.id} for ${order.itemName}? This will also archive the pending placeholder stock item if one was created.`,
    );

    if (!confirmed) return;

    setBusyOrderId(order.id);

    try {
      await onDeleteOrder(order.id);
      setSelectedIds((current) => current.filter((id) => id !== order.id));
    } finally {
      setBusyOrderId(null);
    }
  }

  function renderOrderActions(order: OrderRecord) {
    const locked = isLockedOrder(order);

    return (
      <div className="order-row-actions">
        <button
          type="button"
          className="mini-btn"
          disabled={busyOrderId === order.id}
          onClick={() => openDocumentPicker(order.id, "confirmation")}
        >
          Confirmation
        </button>

        <button
          type="button"
          className="mini-btn"
          onClick={() => void openDocumentsModal(order.id)}
        >
          View Docs
        </button>

        <button
          type="button"
          className="mini-btn"
          disabled={busyOrderId === order.id}
          onClick={() => openDocumentPicker(order.id, "invoice")}
        >
          Invoice
        </button>

        <button
          type="button"
          className="mini-btn"
          disabled={busyOrderId === order.id}
          onClick={() => openDocumentPicker(order.id, "delivery")}
        >
          Delivery Doc
        </button>

        <button
          type="button"
          className="mini-btn good"
          disabled={busyOrderId === order.id || isDeliveredOrder(order)}
          onClick={() => void handleMarkDelivered(order.id)}
        >
          Delivered
        </button>

        <button
          type="button"
          className="mini-btn paid"
          disabled={busyOrderId === order.id || isPaidOrder(order)}
          onClick={() => void handleMarkPaid(order.id)}
        >
          Paid
        </button>

        {!locked && (
          <>
            <button
              type="button"
              className="mini-btn"
              disabled={busyOrderId === order.id}
              onClick={() => openEditOrder(order)}
            >
              Edit
            </button>

            <button
              type="button"
              className="mini-btn danger"
              disabled={busyOrderId === order.id}
              onClick={() => void handleDeleteOrder(order)}
            >
              Delete
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <section className="view active">
      <p className="section-tag">ORDERS</p>

      {pendingDeliveryOrders.length > 0 && (
        <div className="card order-suggestions">
          <div className="card-head">
            <div>
              <h2>Pending Orders / Need Delivery</h2>
              <p className="sub">
                {pendingDeliveryOrders.length} orders still need to be delivered
              </p>
            </div>
          </div>

          <div className="suggestion-list">
            {pendingDeliveryOrders.slice(0, 12).map((order) => (
              <div key={order.id} className="suggestion-row">
                <div>
                  <strong>{order.itemName}</strong>
                  <p className="sub">
                    {text(order.vendor)} · {text(order.catalogNo)} · Qty{" "}
                    {text(order.unitsOrdered)} · Expected{" "}
                    {text(order.expectedDeliveryDate)}
                  </p>
                </div>

                <div className="order-row-actions">
                  <button
                    type="button"
                    className="mini-btn good"
                    disabled={busyOrderId === order.id}
                    onClick={() => void handleMarkDelivered(order.id)}
                  >
                    Mark Delivered
                  </button>

                  {!isLockedOrder(order) && (
                    <>
                      <button
                        type="button"
                        className="mini-btn"
                        disabled={busyOrderId === order.id}
                        onClick={() => openEditOrder(order)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="mini-btn danger"
                        disabled={busyOrderId === order.id}
                        onClick={() => void handleDeleteOrder(order)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestedItems.length > 0 && (
        <div className="card order-suggestions">
          <div className="card-head">
            <div>
              <h2>Suggested Orders</h2>
              <p className="sub">
                Low, critical, or out-of-stock items without an active order
              </p>
            </div>
          </div>

          <div className="suggestion-list">
            {suggestedItems.map((item) => (
              <div key={item.id} className={`suggestion-row ${item.status}`}>
                <div>
                  <strong>{item.itemName}</strong>
                  <p className="sub">
                    {item.catalogueNum} · Qty {item.quantity} · {item.status}
                  </p>
                </div>

                <button
                  type="button"
                  className="mini-btn good"
                  onClick={() => onAddOrderFromInventory(item)}
                >
                  Create Order
                </button>
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
              Displaying <b>{visibleOrders.length} orders</b>
            </p>
          </div>

          <div className="order-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm"
              hidden
              onChange={(event) =>
                void handleFileChange(event.target.files?.[0])
              }
            />

            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xlsm,.doc,.docx"
              hidden
              onChange={(event) =>
                void handleDocumentFileChange(event.target.files?.[0])
              }
            />

            <button type="button" className="btn primary" onClick={onAddOrder}>
              + Add Order
            </button>

            <button
              type="button"
              className="btn tertiary"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? "Importing..." : "Import Excel"}
            </button>

            <button
              type="button"
              className="btn secondary"
              onClick={() => void onExportSelected(selectedIds)}
              disabled={selectedIds.length === 0}
            >
              Export Selected
            </button>

            <button
              type="button"
              className="btn primary"
              onClick={() => void onExportAll()}
            >
              Export All
            </button>

            <button
              type="button"
              className="btn secondary"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="toolbar">
          <div className="filters">
            <button
              type="button"
              className={orderView === "active" ? "chip active" : "chip"}
              onClick={() => setOrderView("active")}
            >
              Active Orders ({activeCount})
            </button>

            <button
              type="button"
              className={orderView === "log" ? "chip active" : "chip"}
              onClick={() => setOrderView("log")}
            >
              Order Log ({logCount})
            </button>

            <button
              type="button"
              className={orderView === "all" ? "chip active" : "chip"}
              onClick={() => setOrderView("all")}
            >
              All
            </button>
          </div>

          <div className="search">
            <span className="search-icon">⌕</span>
            <input
              placeholder="Search orders"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div
          className="top-table-scroll"
          ref={topScrollRef}
          onScroll={syncTopScroll}
        >
          <div style={{ width: tableScrollWidth, height: 1 }} />
        </div>

        <div
          className="table-scroll"
          ref={tableScrollRef}
          onScroll={syncTableScroll}
        >
          <table ref={tableRef}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                  />
                </th>
                <th>Date</th>
                <th>Order Placed By</th>
                <th>PO Number</th>
                <th>Vendor</th>
                <th>Category</th>
                <th>Catalog No.</th>
                <th>Item Name</th>
                <th># Units</th>
                <th>Price / Unit</th>
                <th>Total Price</th>
                <th>Final Price</th>
                <th>Availability</th>
                <th>Expected Delivery</th>
                <th>Order #</th>
                <th>Delivery Date</th>
                <th>Status</th>
                <th>Received By</th>
                <th>Date Paid</th>
                <th>Amount Paid</th>
                <th>CC/Invoice?</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {visibleOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(order.id)}
                      onChange={() => toggleOrder(order.id)}
                    />
                  </td>

                  <td>{text(order.orderDate)}</td>
                  <td>{text(order.orderPlacedBy)}</td>
                  <td>{text(order.poNumber)}</td>
                  <td>{text(order.vendor)}</td>
                  <td>{text(order.category)}</td>
                  <td>{text(order.catalogNo)}</td>
                  <td className="strong-text">{order.itemName}</td>
                  <td>{text(order.unitsOrdered)}</td>
                  <td>{money(order.pricePerUnit)}</td>
                  <td>{money(order.totalPrice)}</td>
                  <td>{money(order.finalPrice)}</td>
                  <td>{text(order.availability)}</td>
                  <td>{text(order.expectedDeliveryDate)}</td>
                  <td>{text(order.orderNumber)}</td>
                  <td>{text(order.deliveryDate)}</td>
                  <td>{text(order.status)}</td>
                  <td>{text(order.receivedBy)}</td>
                  <td>{text(order.datePaid)}</td>
                  <td>{money(order.amountPaid)}</td>
                  <td>{text(order.ccInvoice)}</td>

                  <td>{renderOrderActions(order)}</td>
                </tr>
              ))}

              {visibleOrders.length === 0 && (
                <tr>
                  <td colSpan={22} className="empty-row">
                    {loading ? "Loading orders..." : "No orders found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingOrder && (
        <div className="modal-backdrop" onClick={() => setEditingOrder(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>Edit Order</h2>
                <p className="sub">
                  Order #{editingOrder.id}. Editing is only allowed before
                  delivery and payment.
                </p>
              </div>

              <button
                type="button"
                className="icon-btn"
                onClick={() => setEditingOrder(null)}
              >
                ✕
              </button>
            </div>

            <div className="form-grid">
              <label>
                Date
                <input
                  type="date"
                  value={editForm.orderDate}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      orderDate: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Order Placed By
                <input
                  value={editForm.orderPlacedBy}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      orderPlacedBy: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                PO Number
                <input
                  value={editForm.poNumber}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      poNumber: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Vendor
                <input
                  value={editForm.vendor}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      vendor: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Category
                <input
                  value={editForm.category}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Catalog No.
                <input
                  value={editForm.catalogNo}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      catalogNo: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Item Name
                <input
                  value={editForm.itemName}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      itemName: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label>
                # Units
                <input
                  type="number"
                  value={editForm.unitsOrdered}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      unitsOrdered: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Price / Unit
                <input
                  type="number"
                  step="0.01"
                  value={editForm.pricePerUnit}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      pricePerUnit: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Total Price
                <input
                  type="number"
                  step="0.01"
                  value={editForm.totalPrice}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      totalPrice: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Final Price
                <input
                  type="number"
                  step="0.01"
                  value={editForm.finalPrice}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      finalPrice: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Availability
                <input
                  value={editForm.availability}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      availability: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Expected Delivery
                <input
                  type="date"
                  value={editForm.expectedDeliveryDate}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      expectedDeliveryDate: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Order #
                <input
                  value={editForm.orderNumber}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      orderNumber: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Status
                <input
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setEditingOrder(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn primary"
                disabled={busyOrderId === editingOrder.id}
                onClick={() => void handleSaveEditedOrder()}
              >
                {busyOrderId === editingOrder.id ? "Saving..." : "Save Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {documentModalOrderId !== null && (
        <div className="modal-backdrop" onClick={closeDocumentsModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>Order Documents</h2>
                <p className="sub">Order #{documentModalOrderId}</p>
              </div>

              <button type="button" className="icon-btn" onClick={closeDocumentsModal}>
                ✕
              </button>
            </div>

            {documentsLoading && (
              <p className="modal-message">Loading documents...</p>
            )}

            {documentsError && (
              <p className="error-message">{documentsError}</p>
            )}

            {!documentsLoading && !documentsError && documents.length === 0 && (
              <p className="modal-message">No documents uploaded for this order.</p>
            )}

            {!documentsLoading && documents.length > 0 && (
              <div className="document-list">
                {documents.map((document) => (
                  <div key={document.id} className="document-row">
                    <div>
                      <strong>
                        {document.originalFilename ??
                          `order-document-${document.id}`}
                      </strong>

                      <p className="sub">
                        {document.documentType} ·{" "}
                        {new Date(document.receivedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="document-actions">
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() => void handleDownloadDocument(document)}
                      >
                        Download
                      </button>

                      <button
                        type="button"
                        className="mini-btn danger"
                        disabled={deletingDocumentId === document.id}
                        onClick={() => void handleDeleteDocument(document.id)}
                      >
                        {deletingDocumentId === document.id ? "Deleting..." : "Delete"}
                      </button>
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
