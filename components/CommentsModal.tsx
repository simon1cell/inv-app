"use client";

import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import type { InventoryItem, ItemComment, ItemType } from "@/types/inventory";

/* ─── Composite row type (ItemComment + display fields) ───────── */
export type CommentDisplayRow = ItemComment & {
  itemName: string;
  catalogueNum: string;
};

/* ─── Comment target (mirrors page.tsx internal type) ─────────── */
export type CommentTarget = {
  kind: "item" | "item-type";
  title: string;
  itemIds: string[];
};

/* ─── Overview Dialog (bell click) ───────────────────────────── */
type OverviewProps = {
  open: boolean;
  onClose: () => void;
  unreadCount: number;
  itemTypes: { itemType: ItemType; count: number }[];
  stockItems: { item: InventoryItem; count: number }[];
  onSelectItemType: (it: ItemType) => void;
  onSelectStockItem: (item: InventoryItem) => void;
};

export function CommentOverviewDialog({
  open, onClose, unreadCount, itemTypes, stockItems,
  onSelectItemType, onSelectStockItem,
}: OverviewProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[520px] comment-dialog">
        <DialogHeader>
          <DialogTitle className="comment-dialog-title">
            <MessageSquare size={18} strokeWidth={1.75} />
            Notifications
          </DialogTitle>
          <DialogDescription>
            {unreadCount > 0
              ? `${unreadCount} unread comment${unreadCount !== 1 ? "s" : ""} across inventory`
              : "All caught up — no unread comments."}
          </DialogDescription>
        </DialogHeader>

        <div className="comment-overview-body">
          {/* Item Types */}
          <div className="comment-section">
            <p className="comment-section-label">Item Types</p>
            {itemTypes.length === 0 ? (
              <p className="comment-empty">No unread item type comments.</p>
            ) : (
              <div className="comment-chip-list">
                {itemTypes.map(({ itemType, count }) => (
                  <button
                    key={itemType.id}
                    type="button"
                    className="comment-chip"
                    onClick={() => { onSelectItemType(itemType); onClose(); }}
                  >
                    <MessageSquare size={12} strokeWidth={1.75} />
                    <span>{itemType.name}</span>
                    <span className="comment-chip-badge">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stock Items */}
          <div className="comment-section">
            <p className="comment-section-label">Stock Items</p>
            {stockItems.length === 0 ? (
              <p className="comment-empty">No unread stock item comments.</p>
            ) : (
              <div className="comment-chip-list">
                {stockItems.map(({ item, count }) => (
                  <button
                    key={item.id}
                    type="button"
                    className="comment-chip"
                    onClick={() => { onSelectStockItem(item); onClose(); }}
                  >
                    <MessageSquare size={12} strokeWidth={1.75} />
                    <span>{item.itemName}</span>
                    <span className="comment-chip-cat">{item.catalogueNum}</span>
                    <span className="comment-chip-badge">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Thread Dialog (per item / item-type) ────────────────────── */
type ThreadProps = {
  open: boolean;
  onClose: () => void;
  target: CommentTarget | null;
  comments: CommentDisplayRow[];
  isAdmin: boolean;
  commentInput: string;
  onInputChange: (v: string) => void;
  onAddComment: () => void;
  onDeleteComment: (id: number) => void;
};

export function CommentThreadDialog({
  open, onClose, target, comments, isAdmin,
  commentInput, onInputChange, onAddComment, onDeleteComment,
}: ThreadProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[680px] comment-dialog">
        <DialogHeader>
          <DialogTitle className="comment-dialog-title">
            <MessageSquare size={18} strokeWidth={1.75} />
            {target?.title ?? "Comments"}
          </DialogTitle>
          <DialogDescription>
            {target?.kind === "item-type"
              ? "Aggregated comments from linked stock items"
              : "Comments for this stock item"}
          </DialogDescription>
        </DialogHeader>

        {/* Compose row */}
        <div className="comment-compose-row">
          <Input
            placeholder={
              target?.kind === "item-type"
                ? "Add item type note…"
                : "Add a comment…"
            }
            value={commentInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && commentInput.trim()) {
                e.preventDefault();
                onAddComment();
              }
            }}
          />
          <Button
            size="sm"
            onClick={onAddComment}
            disabled={!commentInput.trim()}
            icon={Plus}
            text="Post"
          />
        </div>

        {/* Thread */}
        <div className="comment-thread">
          {comments.length === 0 ? (
            <div className="comment-thread-empty">
              <MessageSquare size={28} strokeWidth={1.25} />
              <p>No comments yet. Be the first to add one.</p>
            </div>
          ) : (
            comments.map((c) => (
              <motion.div
                key={c.id}
                className="comment-row"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="comment-row-avatar">
                  {c.username.slice(0, 1).toUpperCase()}
                </div>
                <div className="comment-row-body">
                  <div className="comment-row-meta">
                    <span className="comment-row-author">{c.username}</span>
                    <span className="comment-row-time">
                      {new Date(c.createdAt).toLocaleString(undefined, {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                    {c.itemName && (
                      <span className="comment-row-item">{c.itemName}</span>
                    )}
                  </div>
                  <p className="comment-row-text">{c.comment}</p>
                </div>
                {isAdmin && (
                  <motion.button
                    type="button"
                    className="icon-btn del"
                    onClick={() => onDeleteComment(c.id)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    title="Delete comment"
                  >
                    <Trash2 size={13} strokeWidth={1.75} />
                  </motion.button>
                )}
              </motion.div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
