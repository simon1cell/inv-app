"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  InventoryItem,
  OrderDocumentType,
  OrderDocument,
  OrderRecord,
} from "@/types/inventory";

type OrderView = "active" | "log" | "all";

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
  const [aiImporting, setAiImporting] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  const [pendingUpload, setPendingUpload] = useState<{
    orderId: number;
    documentType: OrderDocumentType;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const aiFileInputRef = useRef<HTMLInputElement | null>(null);
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

  const [documentModalOrderId, setDocumentModalOrderId] = useState<number | null>(
  null,
  );
  const [documents, setDocuments] = useState<OrderDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState("");
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(
    null,
  );
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

  return (
    <section className="view active">
      <p className="section-tag">ORDERS</p>

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
              className="btn tertiary"
              onClick={() => aiFileInputRef.current?.click()}
              disabled={aiImporting}
            >
              {aiImporting ? "AI Importing..." : "AI Clean Import"}
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

                  <td>
                    <div className="order-row-actions">
                      <button
                        type="button"
                        className="mini-btn"
                        disabled={busyOrderId === order.id}
                        onClick={() =>
                          openDocumentPicker(order.id, "confirmation")
                        }
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
                        disabled={busyOrderId === order.id}
                        onClick={() => void handleMarkDelivered(order.id)}
                      >
                        Delivered
                      </button>

                      <button
                        type="button"
                        className="mini-btn paid"
                        disabled={busyOrderId === order.id}
                        onClick={() => void handleMarkPaid(order.id)}
                      >
                        Paid
                      </button>
                    </div>
                  </td>
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