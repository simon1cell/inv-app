import type { View } from "@/types/inventory";

type SidebarProps = {
  view: View;
  isAdmin: boolean;
  onViewChange: (view: View) => void;
};

export default function Sidebar({
  view,
  isAdmin,
  onViewChange,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img
          src="/icons/1CellAi-logo.svg"
          alt="1Cell.Ai"
          className="brand-logo"
        />
      </div>

      <div className="nav-label">MENU</div>

      <nav className="nav">
        <button
          type="button"
          className={
            view === "inventory" || view === "edit-item-type" ? "active" : ""
          }
          onClick={() => onViewChange("inventory")}
        >
          <span className="nav-icon">⬡</span>
          Inventory
        </button>

        <button
          type="button"
          className={
            view === "stock-items" ||
            view === "add-item" ||
            view === "edit-item"
              ? "active"
              : ""
          }
          onClick={() => onViewChange("stock-items")}
        >
          <span className="nav-icon">📦</span>
          Stock Items
        </button>

        {isAdmin && (
          <>
            <button
              type="button"
              className={
                view === "orders" || view === "add-order" ? "active" : ""
              }
              onClick={() => onViewChange("orders")}
            >
              <span className="nav-icon">☑</span>
              Orders
            </button>

            <button
              type="button"
              className={view === "users" ? "active" : ""}
              onClick={() => onViewChange("users")}
            >
              <span className="nav-icon">👥</span>
              Users
            </button>

            <button
              type="button"
              className={view === "audit" ? "active" : ""}
              onClick={() => onViewChange("audit")}
            >
              <span className="nav-icon">≣</span>
              Audit Log
            </button>
          </>
        )}
      </nav>
    </aside>
  );
}
