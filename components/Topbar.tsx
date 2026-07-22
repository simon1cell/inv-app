"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellDot, ChevronRight } from "lucide-react";

import type { View } from "@/types/inventory";

/* Map each view to its breadcrumb trail. */
const CRUMBS: Record<View, { root: string; rootView: View; current?: string }> = {
  inventory:        { root: "Inventory",    rootView: "inventory" },
  "stock-items":    { root: "Stock Items",  rootView: "stock-items" },
  orders:           { root: "Orders",       rootView: "orders" },
  "add-item":       { root: "Stock Items",  rootView: "stock-items",    current: "Add Item" },
  "edit-item":      { root: "Stock Items",  rootView: "stock-items",    current: "Edit Item" },
  "add-item-type":  { root: "Inventory",    rootView: "inventory",      current: "Add Item Type" },
  "edit-item-type": { root: "Inventory",    rootView: "inventory",      current: "Edit Item Type" },
  "add-order":      { root: "Orders",       rootView: "orders",         current: "New Order" },
  audit:            { root: "Audit Log",    rootView: "audit" },
  users:            { root: "Users",        rootView: "users" },
};

type TopbarProps = {
  view: View;
  commentCount?: number;
  onCommentsClick?: () => void;
  onViewChange?: (view: View) => void;
};

export default function Topbar({
  view,
  commentCount = 0,
  onCommentsClick,
  onViewChange,
}: TopbarProps) {
  const crumb = CRUMBS[view] ?? { root: "Lab Inventory", rootView: "inventory" };

  return (
    <motion.div
      className="topbar"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {/* Breadcrumb */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <button
          type="button"
          className="bc-root"
          onClick={() => onViewChange?.("inventory")}
        >
          Lab Inventory
        </button>

        <ChevronRight size={12} strokeWidth={2} className="bc-sep" />
        {crumb.current ? (
          <button
            type="button"
            className="bc-mid"
            onClick={() => onViewChange?.(crumb.rootView)}
          >
            {crumb.root}
          </button>
        ) : (
          <span className="bc-leaf">{crumb.root}</span>
        )}

        {crumb.current && (
          <>
            <ChevronRight size={12} strokeWidth={2} className="bc-sep" />
            <span className="bc-leaf">{crumb.current}</span>
          </>
        )}
      </nav>

      {/* Right — notifications bell */}
      <div className="topbar-actions">
        <motion.button
          type="button"
          className="bell-btn"
          title="Comments & notifications"
          onClick={onCommentsClick}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
        >
          {commentCount > 0 ? (
            <>
              <BellDot size={17} strokeWidth={1.75} />
              <AnimatePresence>
                <motion.span
                  className="notification-badge"
                  key={commentCount}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                >
                  {commentCount}
                </motion.span>
              </AnimatePresence>
            </>
          ) : (
            <Bell size={17} strokeWidth={1.75} />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
