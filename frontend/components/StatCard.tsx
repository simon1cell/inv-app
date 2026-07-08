type StatCardProps = {
  label: string;
  value: number;
  icon: string;
  tone?: "warning" | "critical" | "muted" | "danger";
};

export default function StatCard({
  label,
  value,
  icon,
  tone = "muted",
}: StatCardProps) {
  return (
    <div className="stat">
      <div>
        <div className="lbl">{label}</div>
        <div className="val">{value}</div>
      </div>

      <div className={`stat-icon ${tone}`}>{icon}</div>
    </div>
  );
}