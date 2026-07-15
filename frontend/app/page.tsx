"use client";

import {useEffect, useMemo, useState } from "react";
import AddItemForm from "@/components/AddItemForm";
import AddOrderForm from "@/components/AddOrderForm";
import AuditLogTable from "@/components/AuditLogTable";
import InventoryTable from "@/components/InventoryTable";
import OrdersPage from "@/components/OrdersPage";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import Topbar from "@/components/Topbar";
import UsersPage from "@/components/UsersPage";
import {
  createItem,
  createOrderRecord,
  createTransaction,
  createUser,
  deleteItem,
  deleteOrderDocument,
  deleteUser,
  downloadOrderDocument,
  exportOrdersExcel,
  getAuditLogs,
  getCurrentUser,
  getItems,
  getOrderDocuments,
  getOrders,
  getUsers,
  importOrdersExcel,
  login,
  markOrderDelivered,
  markOrderPaid,
  uploadOrderDocument,
  updateItem,
  getItemComments,
  createItemComment,
  deleteItemComment,
  type CurrentUser,
} from "@/lib/api";
import {
  type AuditLog,
  type InventoryItem,
  type Order,
  type OrderDocumentType,
  type OrderRecord,
  type UserAccount,
  type View,
  type ItemComment,
} from "@/types/inventory";

function getInitials(username: string) {
  return (
    username
      .split(/[.\s_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function toApiDate(value?: string | null) {
  if (!value) return null;

  const text = value.trim();

  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (!match) return null;

  const month = match[1].padStart(2, "0");
  const day = match[2].padStart(2, "0");
  const year = match[3];

  return `${year}-${month}-${day}`;
}

function toNumberOrNull(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const cleaned = value.replace("$", "").replace(",", "").trim();
  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      window.setTimeout(
        () => reject(new Error("Backend took too long to respond")),
        ms,
      ),
    ),
  ]);
}

export default function Home() {
  const [view, setView] = useState<View>("inventory");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [token, setToken] = useState("");
  const [user, setUser] = useState<CurrentUser | null>(null);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [restoring, setRestoring] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [busyMessage, setBusyMessage] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [orderSeedItem, setOrderSeedItem] = useState<InventoryItem | null>(null);

  const isAdmin = user?.role?.toLowerCase() === "admin";

  const [commentItem, setCommentItem] = useState<InventoryItem | null>(null);
  const [itemComments, setItemComments] = useState<ItemComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  const stats = useMemo(() => {
    return {
      low: inventory.filter((item) => item.status === "low").length,
      critical: inventory.filter((item) => item.status === "critical").length,
      out: inventory.filter((item) => item.status === "out").length,
      expiring: inventory.filter((item) => item.status === "expiring").length,
    };
  }, [inventory]);

  useEffect(() => {
    async function loadSavedSession() {
      const savedToken = localStorage.getItem("access_token");

      if (!savedToken) {
        setRestoring(false);
        return;
      }

      setRestoring(true);
      setError("");

      try {
        const [currentUser, items] = await withTimeout(
          Promise.all([getCurrentUser(savedToken), getItems(savedToken)]),
          5000,
        );

        setToken(savedToken);
        setUser(currentUser);
        setInventory(items);
      } catch {
        localStorage.removeItem("access_token");
        setToken("");
        setUser(null);
        setInventory([]);
        setError("Session expired or backend is unreachable. Please sign in again.");
      } finally {
        setRestoring(false);
      }
    }

    void loadSavedSession();
  }, []);

  useEffect(() => {
    if (!user) return;

    if (!isAdmin && view !== "inventory") {
      setView("inventory");
    }
  }, [isAdmin, user, view]);

  function showToast(message: string) {
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 2500);
  }

  function goToAddItem() {
    if (!isAdmin) return;

    setEditingItem(null);
    setView("add-item");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToAddOrder(item?: InventoryItem) {
    if (!isAdmin) return;

    setOrderSeedItem(item ?? null);
    setView("add-order");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleEditItem(item: InventoryItem) {
    if (!isAdmin) return;

    setEditingItem(item);
    setView("edit-item");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function refreshInventory(activeToken = token) {
    if (!activeToken) return;

    setLoadingInventory(true);
    setError("");

    try {
      const items = await getItems(activeToken);
      setInventory(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setLoadingInventory(false);
    }
  }

  async function openItemComments(item: InventoryItem) {
    setCommentItem(item);
    setItemComments([]);
    setCommentDraft("");
    setCommentsLoading(true);
    setError("");

    try {
      const comments = await getItemComments(token, item.id);
      setItemComments(comments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setCommentsLoading(false);
    }
  }

  function closeItemComments() {
    setCommentItem(null);
    setItemComments([]);
    setCommentDraft("");
  }

  async function handleCreateItemComment() {
    if (!commentItem || !commentDraft.trim()) return;

    setError("");

    try {
      const created = await createItemComment(
        token,
        commentItem.id,
        commentDraft,
      );

      setItemComments((current) => [created, ...current]);
      setCommentDraft("");
      showToast("Comment added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    }
  }

  async function handleDeleteItemComment(commentId: number) {
    if (!window.confirm("Delete this comment?")) return;

    setError("");

    try {
      await deleteItemComment(token, commentId);
      setItemComments((current) =>
        current.filter((comment) => comment.id !== commentId),
      );
      showToast("Comment deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete comment");
    }
  }

  async function refreshOrders(activeToken = token) {
    if (!activeToken || !isAdmin) return;

    setLoadingOrders(true);
    setError("");

    try {
      const orderList = await getOrders(activeToken);
      setOrders(orderList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoadingOrders(false);
    }
  }

  async function refreshAuditLogs(activeToken = token) {
    if (!activeToken || !isAdmin) return;

    setError("");

    try {
      const logs = await getAuditLogs(activeToken);
      setAuditLogs(logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    }
  }

  async function refreshUsers(activeToken = token) {
    if (!activeToken || !isAdmin) return;

    setLoadingUsers(true);
    setError("");

    try {
      const userList = await getUsers(activeToken);
      setUsers(userList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleLogin() {
    setLoggingIn(true);
    setError("");

    try {
      const tokenData = await withTimeout(
        login(loginUsername, loginPassword),
        5000,
      );

      const accessToken = tokenData.access_token;

      const [currentUser, items] = await withTimeout(
        Promise.all([getCurrentUser(accessToken), getItems(accessToken)]),
        5000,
      );

      localStorage.setItem("access_token", accessToken);

      setToken(accessToken);
      setUser(currentUser);
      setInventory(items);
      setLoginPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoggingIn(false);
      setRestoring(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("access_token");

    setToken("");
    setUser(null);
    setInventory([]);
    setOrders([]);
    setAuditLogs([]);
    setUsers([]);
    setEditingItem(null);
    setOrderSeedItem(null);
    setView("inventory");
    setError("");
  }

  function handleViewChange(nextView: View) {
    if (!isAdmin && nextView !== "inventory") {
      setView("inventory");
      return;
    }

    setView(nextView);

    if (nextView === "audit") {
      void refreshAuditLogs();
    }

    if (nextView === "users") {
      void refreshUsers();
    }

    if (nextView === "orders") {
      void refreshOrders();
    }
  }

  async function handleCreateItem(payload: Parameters<typeof createItem>[1]) {
    setError("");

    try {
      await createItem(token, payload);
      await refreshInventory();

      showToast("Inventory item added");
      setView("inventory");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    }
  }

  async function handleUpdateItem(payload: Parameters<typeof updateItem>[2]) {
    if (!editingItem) return;

    setError("");

    try {
      await updateItem(token, editingItem.id, payload);
      await refreshInventory();

      showToast("Inventory item updated");
      setEditingItem(null);
      setView("inventory");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update item");
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!isAdmin) return;

    const confirmed = window.confirm("Delete this item? This cannot be undone.");

    if (!confirmed) return;

    setBusyMessage("Deleting item...");
    setError("");

    try {
      await deleteItem(token, itemId);
      await refreshInventory();

      if (view === "audit") {
        await refreshAuditLogs();
      }

      showToast("Item deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setBusyMessage("");
    }
  }

  async function handleQuantityChange(item: InventoryItem, nextQuantity: number) {
    const changeAmount = nextQuantity - item.quantity;

    if (changeAmount === 0) return;

    setError("");

    try {
      await createTransaction(token, item.id, changeAmount);
      await refreshInventory();

      if (view === "audit") {
        await refreshAuditLogs();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quantity");
    }
  }

  async function handleSubmitOrder(order: Order) {
    setError("");

    try {
      await createOrderRecord(token, {
        order_date: toApiDate(order.dateOrdered),
        order_placed_by: order.orderPlacedBy || user?.username || null,
        po_number: order.poNumber || null,
        vendor: order.supplier,
        category: order.category || null,
        catalog_no: order.catalogueNum,
        item_name: order.itemName,
        units_ordered: toNumberOrNull(order.unitsOrdered),
        price_per_unit: toNumberOrNull(order.pricePerUnit),
        total_price: toNumberOrNull(order.totalPrice),
        final_price: toNumberOrNull(order.finalPrice || order.totalPrice),
        availability: order.availability || null,
        expected_delivery_date: toApiDate(
          order.expectedDeliveryDate || order.expiryDate,
        ),
        order_number: order.orderNumber || null,
        delivery_date: toApiDate(order.dateDelivered),
        status: order.status || (order.delivered ? "Delivered" : "Ordered"),
        received_by: order.receivedBy || null,
        date_paid: toApiDate(order.datePaid),
        amount_paid: toNumberOrNull(order.amountPaid),
        cc_invoice: order.ccInvoice || null,
      });

      await refreshOrders();
      await refreshInventory();

      showToast("Order added");
      setOrderSeedItem(null);
      setView("orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add order");
    }
  }

  async function handleImportOrders(file: File) {
    setError("");

    try {
      await importOrdersExcel(token, file);
      await refreshOrders();
      await refreshInventory();

      showToast("Orders imported");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import orders");
    }
  }

  async function handleExportAllOrders() {
    setError("");

    try {
      await exportOrdersExcel(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export orders");
    }
  }

  async function handleExportSelectedOrders(ids: number[]) {
    setError("");

    try {
      await exportOrdersExcel(token, ids);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to export selected orders",
      );
    }
  }

  async function handleUploadOrderDocument(
    orderId: number,
    documentType: OrderDocumentType,
    file: File,
  ) {
    setError("");

    try {
      await uploadOrderDocument(token, orderId, documentType, file);
      await refreshOrders();
      await refreshInventory();

      showToast(`${documentType} uploaded`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload order document",
      );
    }
  }

  async function handleGetOrderDocuments(orderId: number) {
    return getOrderDocuments(token, orderId);
  }

  async function handleDownloadOrderDocument(
    documentId: number,
    filename: string,
  ) {
    await downloadOrderDocument(token, documentId, filename);
  }

  async function handleDeleteOrderDocument(documentId: number) {
    await deleteOrderDocument(token, documentId);
    showToast("Document deleted");
  }

  async function handleMarkOrderDelivered(orderId: number) {
    setError("");

    try {
      await markOrderDelivered(token, orderId, {
        delivery_date: new Date().toISOString().slice(0, 10),
        received_by: user?.username ?? null,
        notes: "Marked delivered from Orders page",
      });

      await refreshOrders();
      await refreshInventory();

      showToast("Order marked delivered and inventory updated");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to mark order delivered",
      );
    }
  }

  async function handleMarkOrderPaid(orderId: number) {
    setError("");

    try {
      await markOrderPaid(token, orderId, {
        date_paid: new Date().toISOString().slice(0, 10),
        amount_paid: null,
        cc_invoice: null,
        notes: "Marked paid from Orders page",
      });

      await refreshOrders();

      showToast("Order marked paid");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark order paid");
    }
  }

  async function handleCreateUser(payload: {
    username: string;
    password: string;
    role: "user" | "admin";
  }) {
    if (!isAdmin) return;

    setError("");

    try {
      await createUser(token, payload);
      await refreshUsers();

      showToast(`Created ${payload.role} account`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  }

  async function handleDeleteUser(userId: number) {
    if (!isAdmin) return;

    const confirmed = window.confirm("Delete this user? This cannot be undone.");

    if (!confirmed) return;

    setError("");

    try {
      await deleteUser(token, userId);
      await refreshUsers();

      showToast("User deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  if (restoring) {
    return (
      <main className="login-page">
        <p>Restoring session...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="login-page">
        <form
          className="login-card"
          onSubmit={(event) => {
            event.preventDefault();
            void handleLogin();
          }}
        >
          <div className="brand">
            <div className="mark" />
            <div>
              <div className="name">
                1Cell<span className="ai">.Ai</span>
              </div>
              <div className="tag">AI-Powered Precision Oncology</div>
            </div>
          </div>

          <h1>Inventory Tracking</h1>
          <p>Sign in to manage lab inventory.</p>

          <label>
            Username
            <input
              value={loginUsername}
              onChange={(event) => setLoginUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="error-message">{error}</p>}

          <button
            type="button"
            className="btn primary"
            disabled={loggingIn}
            onClick={() => void handleLogin()}
          >
            {loggingIn ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="app">
      <Sidebar view={view} isAdmin={isAdmin} onViewChange={handleViewChange} />

      <main className="main">
        <Topbar
          name={user.username}
          email={`${user.role} account`}
          initials={getInitials(user.username)}
          onLogout={handleLogout}
        />

        {error && <p className="error-banner">{error}</p>}
        {busyMessage && <p className="loading-banner">{busyMessage}</p>}
        {loadingInventory && (
          <p className="loading-banner">Loading inventory...</p>
        )}

        {view === "inventory" && (
          <section className="view active">
            <div className="stats">
              <StatCard
                label="Low Stock Items"
                value={stats.low}
                icon="📦"
                tone="warning"
              />

              <StatCard
                label="Critically Low Stock Items"
                value={stats.critical}
                icon="⚠"
                tone="critical"
              />

              <StatCard
                label="Out of Stock Items"
                value={stats.out}
                icon="⊘"
                tone="muted"
              />

              <StatCard
                label="Expiring Items"
                value={stats.expiring}
                icon="⏱"
                tone="danger"
              />
            </div>

            <p className="section-tag">INVENTORY</p>

            <InventoryTable
              items={inventory}
              isAdmin={isAdmin}
              onAddItem={goToAddItem}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              onQuantityChange={handleQuantityChange}
              onViewComments={openItemComments}
            />
          </section>
        )}

        {isAdmin && view === "orders" && (
          <OrdersPage
            orders={orders}
            inventoryItems={inventory}
            loading={loadingOrders}
            onRefresh={() => void refreshOrders()}
            onAddOrder={() => goToAddOrder()}
            onAddOrderFromInventory={(item) => goToAddOrder(item)}
            onImportExcel={handleImportOrders}
            onExportAll={handleExportAllOrders}
            onExportSelected={handleExportSelectedOrders}
            onUploadDocument={handleUploadOrderDocument}
            onMarkDelivered={handleMarkOrderDelivered}
            onMarkPaid={handleMarkOrderPaid}
            onGetDocuments={handleGetOrderDocuments}
            onDownloadDocument={handleDownloadOrderDocument}
            onDeleteDocument={handleDeleteOrderDocument}
          />
        )}

        {isAdmin && view === "users" && (
          <UsersPage
            users={users}
            loading={loadingUsers}
            onRefresh={() => void refreshUsers()}
            onCreateUser={handleCreateUser}
            onDeleteUser={handleDeleteUser}
            currentUserId={user.id}
          />
        )}

        {isAdmin && view === "audit" && <AuditLogTable logs={auditLogs} />}

        {isAdmin && view === "add-item" && (
          <AddItemForm
            mode="create"
            onBack={() => setView("inventory")}
            onSubmitItem={handleCreateItem}
          />
        )}

        {isAdmin && view === "edit-item" && editingItem && (
          <AddItemForm
            mode="edit"
            item={editingItem}
            onBack={() => {
              setEditingItem(null);
              setView("inventory");
            }}
            onSubmitItem={handleUpdateItem}
          />
        )}

        {isAdmin && view === "add-order" && (
          <AddOrderForm
            initialItem={orderSeedItem}
            inventoryItems={inventory}
            onBack={() => {
              setOrderSeedItem(null);
              setView("orders");
            }}
            onSubmitOrder={handleSubmitOrder}
          />
        )}

        {commentItem && (
          <div className="modal-backdrop" onClick={closeItemComments}>
            <div className="modal-card" onClick={(event) => event.stopPropagation()}>
              <div className="modal-head">
                <div>
                  <h2>Item Comments</h2>
                  <p className="sub">
                    {commentItem.itemName} · {commentItem.catalogueNum}
                  </p>
                </div>

                <button type="button" className="icon-btn" onClick={closeItemComments}>
                  ✕
                </button>
              </div>

              <div className="comment-compose">
                <textarea
                  placeholder="Add note, issue, reorder comment, storage note..."
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                />

                <button
                  type="button"
                  className="btn primary"
                  disabled={!commentDraft.trim()}
                  onClick={() => void handleCreateItemComment()}
                >
                  Add Comment
                </button>
              </div>

              {commentsLoading && <p className="modal-message">Loading comments...</p>}

              {!commentsLoading && itemComments.length === 0 && (
                <p className="modal-message">No comments yet.</p>
              )}

              {!commentsLoading && itemComments.length > 0 && (
                <div className="comment-list">
                  {itemComments.map((comment) => (
                    <div key={comment.id} className="comment-row">
                      <div>
                        <strong>{comment.username}</strong>
                        <p>{comment.comment}</p>
                        <span>
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          className="mini-btn danger"
                          onClick={() => void handleDeleteItemComment(comment.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <div className={toast ? "toast show" : "toast"}>
        <span>✓</span>
        <span>{toast}</span>
      </div>
    </div>
  );
}