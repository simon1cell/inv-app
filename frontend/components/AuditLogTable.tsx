import type { AuditLog } from "@/types/inventory";

type AuditLogTableProps = {
  logs: AuditLog[];
};

function formatChange(value: number | null) {
  if (value === null) return "—";
  return value > 0 ? `+${value}` : value;
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    CREATE_ITEM: "Created Item",
    UPDATE_ITEM: "Updated Item",
    DELETE_ITEM: "Deleted Item",
    ITEM_COMMENT: "Item Comment",
    DELETE_ITEM_COMMENT: "Deleted Item Comment",
    TRANSACTION: "Inventory Transaction",
    DELETE_ORDER_DOCUMENT: "Deleted Order Document",
    CREATE_ORDER: "Created Order",
    IMPORT_ORDERS: "Imported Orders",
    AI_IMPORT_ORDERS: "AI Imported Orders",
    UPLOAD_ORDER_DOCUMENT: "Uploaded Order Document",
    ORDER_CONFIRMED: "Order Confirmed",
    ORDER_DELIVERED: "Order Delivered",
    ORDER_PAID: "Order Paid",
  };

  return labels[action] ?? action.replace(/_/g, " ");
}

export default function AuditLogTable({ logs }: AuditLogTableProps) {
  return (
    <section className="view active">
      <p className="section-tag">AUDIT LOG</p>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Audit Log</h2>
            <p className="sub">
              Inventory and order actions recorded by the system.
            </p>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Item ID</th>
                <th>Old Qty</th>
                <th>Change</th>
                <th>New Qty</th>
                <th>Details</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.username}</td>

                  <td>
                    <div className="audit-action">
                      <strong>{actionLabel(log.action)}</strong>
                      <code>{log.action}</code>
                    </div>
                  </td>

                  <td>{log.itemId ?? "—"}</td>
                  <td>{log.oldQuantity ?? "—"}</td>
                  <td>{formatChange(log.changeAmount)}</td>
                  <td>{log.newQuantity ?? "—"}</td>
                  <td>{log.details ?? "—"}</td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    No audit entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}