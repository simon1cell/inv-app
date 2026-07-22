"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import type { View } from "@/types/inventory";

type SidebarProps = {
  view: View;
  isAdmin: boolean;
  username: string;
  role: string;
  initials: string;
  onViewChange: (view: View) => void;
  onLogout: () => void;
};

const NAV_ITEMS = [
  {
    view: "inventory" as View,
    label: "Inventory",
    icon: LayoutDashboard,
    adminOnly: false,
    matchViews: ["inventory", "add-item-type", "edit-item-type"] as View[],
  },
  { view: "stock-items" as View, label: "Stock Items", icon: Package,         adminOnly: false, matchViews: ["stock-items", "add-item", "edit-item"] as View[] },
  { view: "orders" as View,     label: "Orders",      icon: ClipboardList,   adminOnly: true,  matchViews: ["orders", "add-order"] as View[] },
  { view: "users" as View,      label: "Users",       icon: Users,           adminOnly: true  },
  { view: "audit" as View,      label: "Audit Log",   icon: ScrollText,      adminOnly: true  },
];

export default function Sidebar({ view, isAdmin, username, role, initials, onViewChange, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="sidebar-wrapper">
      <motion.aside
        className="sidebar"
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Image
              src="/logo-dark.png"
              alt="1Cell.AI"
              width={collapsed ? 32 : 148}
              height={36}
              loading="eager"
              style={{ objectFit: "contain", objectPosition: "left", width: "auto", height: 36, maxWidth: collapsed ? 32 : 148, transition: "max-width 0.25s ease" }}
            />
          </div>
        </div>

        {/* Nav section label */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              className="nav-label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              NAVIGATION
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <nav className="nav">
          {visibleItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.matchViews?.includes(view) ?? view === item.view;
            return (
              <motion.button
                key={item.view}
                type="button"
                className={`nav-item${isActive ? " active" : ""}`}
                title={collapsed ? item.label : undefined}
                onClick={() => onViewChange(item.view)}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.22, ease: "easeOut" }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="nav-icon">
                  <Icon size={17} strokeWidth={1.75} />
                </span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      className="nav-label-text"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18 }}
                      style={{ overflow: "hidden", whiteSpace: "nowrap" }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Footer: theme toggle + user + logout */}
        <div className="sidebar-footer">
          {/* User Account label */}
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                className="nav-label"
                style={{ paddingBottom: 6 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                USER ACCOUNT
              </motion.div>
            )}
          </AnimatePresence>

          {/* User row */}
          <div className="sidebar-user">
            <div className="sidebar-avatar" title={`${username} (${role})`}>{initials}</div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  className="sidebar-user-info"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ overflow: "hidden", flex: 1, minWidth: 0 }}
                >
                  <div className="sidebar-username">{username}</div>
                  <div className="sidebar-role">{role}</div>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              type="button"
              className="sidebar-logout"
              title="Log out"
              onClick={onLogout}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <LogOut size={14} strokeWidth={1.75} />
            </motion.button>
          </div>
        </div>
      </motion.aside>

      {/* Collapse toggle — floats on the border */}
      <motion.button
        type="button"
        className="sidebar-collapse-btn"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={() => setCollapsed((c) => !c)}
        animate={{ left: collapsed ? 64 : 220 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {collapsed
          ? <PanelLeftOpen size={13} strokeWidth={2} />
          : <PanelLeftClose size={13} strokeWidth={2} />}
      </motion.button>
    </div>
  );
}
