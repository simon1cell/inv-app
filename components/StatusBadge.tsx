import { STATUS_LABEL, type Status } from "@/types/inventory";

type StatusBadgeProps = {
  status: Status;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`badge ${status}`}>{STATUS_LABEL[status]}</span>;
}