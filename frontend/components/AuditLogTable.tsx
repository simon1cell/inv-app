import type { AuditLog } from "@/types/inventory";

type AuditLogTableProps = {
  logs: AuditLog[];
};

function formatChange(value: number | null) {
  if (value === null) return "—";
  return value > 0 ? `+${value}` : value;
}

export default function AuditLogTable({ logs }: AuditLogTableProps) {
  return (
    <section className="view active">
      <p className="section-tag">AUDIT LOG</p>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Audit Log</h2>
            <p className="sub">Inventory transactions recorded by the system.</p>
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
                    <code>{log.action}</code>
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