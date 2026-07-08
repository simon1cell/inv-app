"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import AddOrderForm from "@/components/AddOrderForm";
import AuditLogTable from "@/components/AuditLogTable";
import InventoryTable from "@/components/InventoryTable";
import OrdersPage from "@/components/OrdersPage";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import Topbar from "@/components/Topbar";
import {
  createTransaction,
  deleteItem,
  getAuditLogs,
  getCurrentUser,
  getItems,
  login,
  type CurrentUser,
} from "@/lib/api";
import {
  INITIAL_HISTORY,
  INITIAL_ORDERS,
  type AuditLog,
  type InventoryItem,
  type Order,
  type View,
} from "@/types/inventory";

function getInitials(username: string) {
  return username
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");

  const [token, setToken] = useState("");
  const [user, setUser] = useState<CurrentUser | null>(null);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [restoring, setRestoring] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [busyMessage, setBusyMessage] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const inventoryAnchorRef = useRef<HTMLParagraphElement | null>(null);

  const isAdmin = user?.role?.toLowerCase() === "admin";

  const stats = useMemo(() => {
    return {
      low: inventory.filter((item) => item.status === "low").length,
      critical: inventory.filter((item) => item.status === "critical").length,
      out: inventory.filter((item) => item.status === "out").length,
      expiring: inventory.filter((item) => item.status === "expiring").length,
    };
  }, [inventory]);

  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");

    if (!savedToken) {
      setRestoring(false);
      return;
    }

    setToken(savedToken);
  }, []);

  useEffect(() => {
    if (!token) return;

    void restoreSession(token);
  }, [token]);

  function showToast(message: string) {
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 2500);
  }

  async function restoreSession(activeToken: string) {
    setRestoring(true);
    setError("");

    try {
      const [currentUser, items] = await Promise.all([
        getCurrentUser(activeToken),
        getItems(activeToken),
      ]);

      setUser(currentUser);
      setInventory(items);
    } catch (err) {
      localStorage.removeItem("access_token");
      setToken("");
      setUser(null);
      setInventory([]);
      setError(err instanceof Error ? err.message : "Failed to restore session");
    } finally {
      setRestoring(false);
    }
  }

  async function refreshInventory(activeToken = token) {
    if (!activeToken) return;

    setLoadingInventory(true);
    setError("");

    try {
      const items = await getItems(activeToken);
      setInventory(items);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setLoadingInventory(false);
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

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoggingIn(true);
    setError("");

    try {
      const tokenData = await login(loginUsername, loginPassword);

      localStorage.setItem("access_token", tokenData.access_token);

      setToken(tokenData.access_token);
      setLoginPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("access_token");

    setToken("");
    setUser(null);
    setInventory([]);
    setAuditLogs([]);
    setView("dashboard");
    setError("");
  }

  function handleViewChange(nextView: View) {
    setView(nextView);

    if (nextView === "audit") {
      void refreshAuditLogs();
    }
  }

  function goToInventory() {
    setView("dashboard");

    window.setTimeout(() => {
      inventoryAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  function goToAddForm() {
    setView("add");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleQuantityChange(
    item: InventoryItem,
    nextQuantity: number,
  ) {
    if (!Number.isInteger(nextQuantity) || nextQuantity < 0) {
      setError("Quantity must be a whole number that is 0 or higher.");
      return;
    }

    const changeAmount = nextQuantity - item.quantity;

    if (changeAmount === 0) return;

    if (changeAmount > 0 && !isAdmin) {
      setError("Only admins can increase item quantity.");
      return;
    }

    setBusyMessage(`Updating ${item.itemName}...`);
    setError("");

    try {
      await createTransaction(token, item.id, changeAmount);
      await refreshInventory();

      if (view === "audit") {
        await refreshAuditLogs();
      }

      showToast("Quantity updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quantity");
    } finally {
      setBusyMessage("");
    }
  }

  async function handleDeleteItem(itemId: number) {
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

  function handleEditItem(item: InventoryItem) {
    showToast(`Edit item modal next: ${item.itemName}`);
  }

  function handleSubmitOrder(order: Order) {
    if (order.delivered) {
      setHistory((current) => [order, ...current]);
    } else {
      setOrders((current) => [order, ...current]);
    }

    showToast("Order logged locally");
    setView("orders");
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
        <form className="login-card" onSubmit={handleLogin}>
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

          <button type="submit" className="btn primary" disabled={loggingIn}>
            {loggingIn ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="app">
      <Sidebar
        view={view}
        onViewChange={handleViewChange}
        onInventoryClick={goToInventory}
      />

      <main className="main">
        <Topbar
          name={user.username}
          email={`${user.role} account`}
          initials={getInitials(user.username)}
          onLogout={handleLogout}
        />

        {error && <p className="error-banner">{error}</p>}
        {busyMessage && <p className="loading-banner">{busyMessage}</p>}
        {loadingInventory && <p className="loading-banner">Loading inventory...</p>}

        {view === "dashboard" && (
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

            <p className="section-tag" ref={inventoryAnchorRef}>
              INVENTORY
            </p>

            <InventoryTable
              items={inventory}
              isAdmin={isAdmin}
              onAddItem={goToAddForm}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              onQuantityChange={handleQuantityChange}
            />
          </section>
        )}

        {view === "orders" && (
          <OrdersPage
            orders={orders}
            history={history}
            onLogOrder={goToAddForm}
          />
        )}

        {view === "add" && (
          <AddOrderForm
            onBack={() => setView("orders")}
            onSubmitOrder={handleSubmitOrder}
          />
        )}

        {view === "audit" && <AuditLogTable logs={auditLogs} />}
      </main>

      <div className={toast ? "toast show" : "toast"}>
        <span>✓</span>
        <span>{toast}</span>
      </div>
    </div>
  );
}