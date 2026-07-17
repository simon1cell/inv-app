"use client";

import { useEffect, useState } from "react";

import type { ItemType } from "@/types/inventory";

type ItemTypePayload = {
  name: string;
  category?: string | null;
  reorder_threshold?: number;
  critical_threshold?: number;
};

type ItemTypeFormProps = {
  itemType: ItemType;
  onBack: () => void;
  onSubmitItemType: (payload: ItemTypePayload) => Promise<void>;
};

export default function ItemTypeForm({
  itemType,
  onBack,
  onSubmitItemType,
}: ItemTypeFormProps) {
  const [form, setForm] = useState({
    name: itemType.name,
    category: itemType.category ?? "",
    reorderThreshold: String(itemType.reorderThreshold),
    criticalThreshold: String(itemType.criticalThreshold),
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: itemType.name,
      category: itemType.category ?? "",
      reorderThreshold: String(itemType.reorderThreshold),
      criticalThreshold: String(itemType.criticalThreshold),
    });
  }, [itemType]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);

    try {
      await onSubmitItemType({
        name: form.name.trim(),
        category: form.category.trim() || null,
        reorder_threshold: Number(form.reorderThreshold || 0),
        critical_threshold: Number(form.criticalThreshold || 0),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="view active">
      <p className="section-tag">ITEM TYPE</p>

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="card-head">
          <div>
            <h2>Edit Item Type</h2>
            <p className="sub">
              Edit the grouped inventory record. Brands and quantity come from
              linked stock items.
            </p>
          </div>

          <button type="button" className="btn" onClick={onBack}>
            Back
          </button>
        </div>

        <div className="form-grid">
          <label>
            Item Type Name
            <input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              required
            />
          </label>

          <label>
            Category
            <input
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Reorder Threshold
            <input
              type="number"
              min="0"
              value={form.reorderThreshold}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  reorderThreshold: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Critical Threshold
            <input
              type="number"
              min="0"
              value={form.criticalThreshold}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  criticalThreshold: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="btn" onClick={onBack}>
            Cancel
          </button>

          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "Saving..." : "Save Item Type"}
          </button>
        </div>
      </form>
    </section>
  );
}
