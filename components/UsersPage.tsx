"use client";

import { useMemo, useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Shield, Trash2, User, UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { SortableHeader, TablePaginator } from "@/components/ui/sortable-table";
import { useSortable } from "@/lib/table-hooks";

import type { UserAccount } from "@/types/inventory";

const PAGE_SIZE = 10;
type SortKey = "username" | "role";

type UsersPageProps = {
  users: UserAccount[];
  loading: boolean;
  currentUserId: number;
  onRefresh: () => void;
  onCreateUser: (payload: { username: string; password: string; role: "user" | "admin" }) => Promise<void>;
  onDeleteUser: (userId: number) => Promise<void>;
};

function RolePill({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span className={`role-pill ${isAdmin ? "admin" : "user"}`}>
      {isAdmin
        ? <Shield size={11} strokeWidth={2} />
        : <User size={11} strokeWidth={2} />}
      {role}
    </span>
  );
}

export default function UsersPage({
  users, loading, currentUserId, onRefresh, onCreateUser, onDeleteUser,
}: UsersPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [creating, setCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { sort, toggleSort } = useSortable<SortKey>("username");

  const sorted = useMemo(() => {
    return [...users].sort((a, b) => {
      const dir = sort.direction === "asc" ? 1 : -1;
      if (sort.key === "role") return a.role.localeCompare(b.role) * dir;
      return a.username.localeCompare(b.username) * dir;
    });
  }, [users, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleUsers = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const adminCount = users.filter((u) => u.role === "admin").length;
  const userCount  = users.filter((u) => u.role !== "admin").length;

  function resetForm() {
    setUsername("");
    setPassword("");
    setRole("user");
  }

  function closeDialog() {
    setDialogOpen(false);
    resetForm();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setCreating(true);
    try {
      await onCreateUser({ username: username.trim(), password, role });
      closeDialog();
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="view active">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Team Members</h2>
          <p className="page-sub">
            {users.length} {users.length === 1 ? "account" : "accounts"} —{" "}
            <span className="stat-inline admin">{adminCount} admin{adminCount !== 1 ? "s" : ""}</span>
            {" · "}
            <span className="stat-inline user">{userCount} user{userCount !== 1 ? "s" : ""}</span>
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            icon={RefreshCw}
            iconClass={loading ? "animate-spin" : ""}
            text={loading ? "Refreshing…" : "Refresh"}
          />
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            icon={UserPlus}
            text="Add User"
          />
        </div>
      </div>

      {/* Full-width user table */}
      <div className="card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader label="Username" sortKey="username" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Role"     sortKey="role"     sort={sort} onSort={toggleSort} />
              <TableHead style={{ width: 52 }} />
            </TableRow>
          </TableHeader>

          <TableBody>
            <AnimatePresence initial={false}>
              {visibleUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  className="border-b transition-colors hover:bg-muted/40"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.16 }}
                >
                  <TableCell>
                    <div className="user-cell">
                      <div className="user-avatar-sm">{user.username.slice(0, 1).toUpperCase()}</div>
                      <span className="user-cell-name">{user.username}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <RolePill role={user.role} />
                  </TableCell>

                  <TableCell>
                    <motion.button
                      type="button"
                      className="icon-btn del"
                      disabled={user.id === currentUserId}
                      title={user.id === currentUserId ? "Cannot delete your own account" : `Delete ${user.username}`}
                      onClick={() => void onDeleteUser(user.id)}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Trash2 size={13} strokeWidth={1.75} />
                    </motion.button>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>

            {visibleUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="empty-row">
                  {loading ? "Loading…" : "No accounts found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <TablePaginator
          page={safePage}
          totalPages={totalPages}
          totalItems={sorted.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Create a new account with immediate sign-in access.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="add-user-form">
            <div className="form-field">
              <Label htmlFor="new-username">
                Username <span className="req-star">*</span>
              </Label>
              <Input
                id="new-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. jsmith"
                autoComplete="off"
                required
              />
            </div>

            <div className="form-field">
              <Label htmlFor="new-password">
                Password <span className="req-star">*</span>
              </Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Temporary password"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="form-field">
              <Label>Role</Label>
              <div className="role-radio-group">
                <label className={`role-radio-card${role === "user" ? " selected" : ""}`}>
                  <input
                    type="radio"
                    name="role"
                    value="user"
                    checked={role === "user"}
                    onChange={() => setRole("user")}
                    className="role-radio-input"
                  />
                  <User size={16} strokeWidth={1.75} className="role-radio-icon" />
                  <div>
                    <div className="role-radio-label">User</div>
                    <div className="role-radio-sub">View &amp; comment</div>
                  </div>
                </label>

                <label className={`role-radio-card${role === "admin" ? " selected" : ""}`}>
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === "admin"}
                    onChange={() => setRole("admin")}
                    className="role-radio-input"
                  />
                  <Shield size={16} strokeWidth={1.75} className="role-radio-icon" />
                  <div>
                    <div className="role-radio-label">Admin</div>
                    <div className="role-radio-sub">Full access</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="add-user-actions">
              <Button type="button" variant="outline" onClick={closeDialog} style={{ flex: 1 }} icon={X} text="Cancel" />
              <Button
                type="submit"
                disabled={creating || !username.trim() || !password.trim()}
                style={{ flex: 1 }}
                icon={UserPlus}
                text={creating ? "Creating…" : "Create Account"}
              />
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </section>
  );
}