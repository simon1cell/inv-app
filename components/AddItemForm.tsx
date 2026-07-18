"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { InventoryItem, ItemType, OrderRecord } from "@/types/inventory";

type ItemPayload = {
  item_type_id?: number | null;
  catalogue_num: string;
  item_name: string;
  lot_num?: number | null;
  quantity: number;
  storage_id: string;
  expiry_date?: string | null;
  last_restocked?: string;
  brand?: string | null;
  reorder_threshold?: number;
  critical_threshold?: number;
  category?: string;
  shelf_num?: string | null;
  tags?: string;
};

type AddItemFormProps = {
  mode: "create" | "edit";
  item?: InventoryItem | null;
  itemTypes: ItemType[];
  orders?: OrderRecord[];
  onBack: () => void;
  onSubmitItem: (payload: ItemPayload) => Promise<void>;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cleanDisplay(value: string | null | undefined) {
  if (!value || value === "—" || value === "NA") return "";
  return value;
}

function toInputDate(value: string | null | undefined) {
  const clean = cleanDisplay(value);
  if (!clean) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const match = clean.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[1]}-${match[2]}`;
}

function toNumber(value: string, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toNullableNumber(value: string) {
  const clean = value.trim();
  if (!clean) return null;
  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
}

export default function AddItemForm({ mode, item, itemTypes, onBack, onSubmitItem }: AddItemFormProps) {
  const currentItemType = useMemo(() => {
    if (!item?.itemTypeId) return null;
    return itemTypes.find((c) => c.id === item.itemTypeId) ?? null;
  }, [item, itemTypes]);

  const [form, setForm] = useState({
    itemTypeId: "",
    itemName: "",
    category: "",
    catalogueNum: "",
    brand: "",
    storageId: "",
    shelfNum: "",
    lotNum: "",
    quantity: "0",
    expiryDate: "",
    lastRestocked: today(),
    reorderThreshold: "5",
    criticalThreshold: "1",
    tags: "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === "edit" && item) {
      setForm({
        itemTypeId: item.itemTypeId ? String(item.itemTypeId) : "",
        itemName: item.itemName,
        category: cleanDisplay(item.category),
        catalogueNum: item.catalogueNum,
        brand: cleanDisplay(item.brand),
        storageId: cleanDisplay(item.storageId),
        shelfNum: cleanDisplay(item.shelfNum),
        lotNum: cleanDisplay(item.lotNum),
        quantity: String(item.quantity),
        expiryDate: toInputDate(item.expiryDate),
        lastRestocked: today(),
        reorderThreshold: String(currentItemType?.reorderThreshold ?? 5),
        criticalThreshold: String(currentItemType?.criticalThreshold ?? 1),
        tags: item.tags.join(", "),
      });
      return;
    }
    setForm({
      itemTypeId: "",
      itemName: "",
      category: "",
      catalogueNum: "",
      brand: "",
      storageId: "",
      shelfNum: "",
      lotNum: "",
      quantity: "0",
      expiryDate: "",
      lastRestocked: today(),
      reorderThreshold: "5",
      criticalThreshold: "1",
      tags: "",
    });
  }, [currentItemType, item, mode]);

  function handleItemTypeChange(value: string) {
    const selected = itemTypes.find((c) => String(c.id) === value);
    setForm((f) => ({
      ...f,
      itemTypeId: value,
      itemName: mode === "create" && selected ? selected.name : f.itemName,
      category: selected?.category ?? f.category,
      reorderThreshold: String(selected?.reorderThreshold ?? f.reorderThreshold),
      criticalThreshold: String(selected?.criticalThreshold ?? f.criticalThreshold),
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: ItemPayload = {
        item_type_id: form.itemTypeId ? Number(form.itemTypeId) : null,
        catalogue_num: form.catalogueNum.trim(),
        item_name: form.itemName.trim(),
        lot_num: toNullableNumber(form.lotNum),
        quantity: toNumber(form.quantity),
        storage_id: form.storageId.trim(),
        expiry_date: form.expiryDate || null,
        brand: form.brand.trim() || null,
        reorder_threshold: toNumber(form.reorderThreshold, 5),
        critical_threshold: toNumber(form.criticalThreshold, 1),
        category: form.category.trim() || "Uncategorized",
        shelf_num: form.shelfNum.trim() || null,
        tags: form.tags.trim(),
      };
      if (mode === "create") payload.last_restocked = form.lastRestocked || today();
      await onSubmitItem(payload);
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
          <h2 className="page-title">
            {mode === "create" ? "Add Stock Item" : "Edit Stock Item"}
          </h2>
          <p className="page-sub">
            Stock items are individual catalog, lot, storage, and quantity records.
          </p>
        </div>
      </div>

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Item Type */}
          <div className="form-field">
            <Label htmlFor="itemTypeId">Item Type <span className="req-star">*</span></Label>
            <Select value={form.itemTypeId} onValueChange={handleItemTypeChange} required>
              <SelectTrigger id="itemTypeId">
                <SelectValue placeholder="Select item type" />
              </SelectTrigger>
              <SelectContent>
                {itemTypes.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}{t.category ? ` · ${t.category}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Catalog Number */}
          <div className="form-field">
            <Label htmlFor="catalogueNum">Catalog Number <span className="req-star">*</span></Label>
            <Input id="catalogueNum" value={form.catalogueNum} onChange={set("catalogueNum")} disabled={mode === "edit"} required />
          </div>

          {/* Item Name */}
          <div className="form-field">
            <Label htmlFor="itemName">Item Name <span className="req-star">*</span></Label>
            <Input id="itemName" value={form.itemName} onChange={set("itemName")} required />
          </div>

          {/* Category */}
          <div className="form-field">
            <Label htmlFor="category">Category</Label>
            <Input id="category" value={form.category} onChange={set("category")} />
          </div>

          {/* Brand */}
          <div className="form-field">
            <Label htmlFor="brand">Brand / Vendor</Label>
            <Input id="brand" value={form.brand} onChange={set("brand")} />
          </div>

          {/* Storage */}
          <div className="form-field">
            <Label htmlFor="storageId">Storage <span className="req-star">*</span></Label>
            <Input id="storageId" value={form.storageId} onChange={set("storageId")} required />
          </div>

          {/* Shelf # */}
          <div className="form-field">
            <Label htmlFor="shelfNum">Shelf #</Label>
            <Input id="shelfNum" value={form.shelfNum} onChange={set("shelfNum")} />
          </div>

          {/* Lot # */}
          <div className="form-field">
            <Label htmlFor="lotNum">Lot #</Label>
            <Input id="lotNum" value={form.lotNum} onChange={set("lotNum")} />
          </div>

          {/* Quantity */}
          <div className="form-field">
            <Label htmlFor="quantity">Quantity <span className="req-star">*</span></Label>
            <Input id="quantity" type="number" value={form.quantity} onChange={set("quantity")} required />
          </div>

          {/* Expiry Date */}
          <div className="form-field">
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input id="expiryDate" type="date" value={form.expiryDate} onChange={set("expiryDate")} />
          </div>

          {/* Last Restocked — create only */}
          {mode === "create" && (
            <div className="form-field">
              <Label htmlFor="lastRestocked">Last Restocked</Label>
              <Input id="lastRestocked" type="date" value={form.lastRestocked} onChange={set("lastRestocked")} />
            </div>
          )}

          {/* Reorder Threshold */}
          <div className="form-field">
            <Label htmlFor="reorderThreshold">Reorder Threshold</Label>
            <Input id="reorderThreshold" type="number" min="0" value={form.reorderThreshold} onChange={set("reorderThreshold")} />
          </div>

          {/* Critical Threshold */}
          <div className="form-field">
            <Label htmlFor="criticalThreshold">Critical Threshold</Label>
            <Input id="criticalThreshold" type="number" min="0" value={form.criticalThreshold} onChange={set("criticalThreshold")} />
          </div>

          {/* Tags */}
          <div className="form-field">
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" value={form.tags} onChange={set("tags")} placeholder="gloves, freezer, order" />
          </div>
        </div>

        <div className="form-actions">
          <Button type="button" variant="outline" onClick={onBack} icon={X} text="Cancel" />
          <Button
            type="submit"
            disabled={saving}
            icon={Save}
            text={saving ? "Saving…" : mode === "create" ? "Add Stock Item" : "Save Stock Item"}
          />
        </div>
      </form>
    </section>
  );
}
