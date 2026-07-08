import type { View } from "@/types/inventory";

type SidebarProps = {
  view: View;
  onViewChange: (view: View) => void;
  onInventoryClick: () => void;
};

export default function Sidebar({
  view,
  onViewChange,
  onInventoryClick,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="mark" />

        <div>
          <div className="name">
            1Cell<span className="ai">.Ai</span>
          </div>
          <div className="tag">AI-Powered Precision Oncology</div>
        </div>
      </div>

      <div className="nav-label">MENU</div>

      <nav className="nav">
        <button
          type="button"
          className={view === "dashboard" ? "active" : ""}
          onClick={() => onViewChange("dashboard")}
        >
          <span className="nav-icon">▦</span>
          Dashboard
        </button>

        <button type="button" onClick={onInventoryClick}>
          <span className="nav-icon">⬡</span>
          Inventory
        </button>

        <button
          type="button"
          className={view === "orders" || view === "add" ? "active" : ""}
          onClick={() => onViewChange("orders")}
        >
          <span className="nav-icon">☑</span>
          Orders
        </button>

        <button
          type="button"
          className={view === "audit" ? "active" : ""}
          onClick={() => onViewChange("audit")}
        >
          <span className="nav-icon">≣</span>
          Audit Log
        </button>

        <button type="button" onClick={() => onViewChange("dashboard")}>
          <span className="nav-icon">⚗</span>
          Life Sciences
        </button>
      </nav>
    </aside>
  );
}