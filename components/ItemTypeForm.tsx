"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export default function ItemTypeForm({ itemType, onBack, onSubmitItemType }: ItemTypeFormProps) {
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <section className="view active">
      <div className="page-header">
        <div>
          <h2 className="page-title">Edit Item Type</h2>
          <p className="page-sub">
            Edit the grouped inventory record. Brands and quantity come from linked stock items.
          </p>
        </div>
      </div>

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <Label htmlFor="name">Item Type Name <span className="req-star">*</span></Label>
            <Input id="name" value={form.name} onChange={set("name")} required />
          </div>

          <div className="form-field">
            <Label htmlFor="category">Category</Label>
            <Input id="category" value={form.category} onChange={set("category")} />
          </div>

          <div className="form-field">
            <Label htmlFor="reorderThreshold">Reorder Threshold</Label>
            <Input id="reorderThreshold" type="number" min="0" value={form.reorderThreshold} onChange={set("reorderThreshold")} />
          </div>

          <div className="form-field">
            <Label htmlFor="criticalThreshold">Critical Threshold</Label>
            <Input id="criticalThreshold" type="number" min="0" value={form.criticalThreshold} onChange={set("criticalThreshold")} />
          </div>
        </div>

        <div className="form-actions">
          <Button type="button" variant="outline" onClick={onBack} icon={X} text="Cancel" />
          <Button
            type="submit"
            disabled={saving}
            icon={Save}
            text={saving ? "Saving…" : "Save Item Type"}
          />
        </div>
      </form>
    </section>
  );
}
