"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  InventoryItem,
  ItemType,
  OrderRecord,
} from "@/types/inventory";

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

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

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

export default function AddItemForm({
  mode,
  item,
  itemTypes,
  onBack,
  onSubmitItem,
}: AddItemFormProps) {
  const currentItemType = useMemo(() => {
    if (!item?.itemTypeId) return null;

    return itemTypes.find((candidate) => candidate.id === item.itemTypeId) ?? null;
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
    const selectedItemType = itemTypes.find(
      (candidate) => String(candidate.id) === value,
    );

    setForm((current) => ({
      ...current,
      itemTypeId: value,
      itemName:
        mode === "create" && selectedItemType
          ? selectedItemType.name
          : current.itemName,
      category: selectedItemType?.category ?? current.category,
      reorderThreshold: String(
        selectedItemType?.reorderThreshold ?? current.reorderThreshold,
      ),
      criticalThreshold: String(
        selectedItemType?.criticalThreshold ?? current.criticalThreshold,
      ),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

      if (mode === "create") {
        payload.last_restocked = form.lastRestocked || today();
      }

      await onSubmitItem(payload);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="view active">
      <p className="section-tag">
        STOCK ITEMS / {mode === "create" ? "Adding Stock Item" : "Editing Stock Item"}
      </p>

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="card-head">
          <div>
            <h2>{mode === "create" ? "Add Stock Item" : "Edit Stock Item"}</h2>
            <p className="sub">
              Stock items are individual catalog, lot, storage, and quantity
              records. Orders are handled from the Orders page.
            </p>
          </div>

          <button type="button" className="btn" onClick={onBack}>
            Back
          </button>
        </div>

        <div className="form-grid">
          <label>
            Item Type *
            <select
              value={form.itemTypeId}
              onChange={(event) => handleItemTypeChange(event.target.value)}
              required
            >
              <option value="">Select item type</option>
              {itemTypes.map((itemType) => (
                <option key={itemType.id} value={itemType.id}>
                  {itemType.name}
                  {itemType.category ? ` · ${itemType.category}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            Catalog Number *
            <input
              value={form.catalogueNum}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  catalogueNum: event.target.value,
                }))
              }
              disabled={mode === "edit"}
              required
            />
          </label>

          <label>
            Item Name *
            <input
              value={form.itemName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  itemName: event.target.value,
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
            Brand / Vendor
            <input
              value={form.brand}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  brand: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Storage *
            <input
              value={form.storageId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  storageId: event.target.value,
                }))
              }
              required
            />
          </label>

          <label>
            Shelf #
            <input
              value={form.shelfNum}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  shelfNum: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Lot #
            <input
              value={form.lotNum}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  lotNum: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Quantity *
            <input
              type="number"
              value={form.quantity}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  quantity: event.target.value,
                }))
              }
              required
            />
          </label>

          <label>
            Expiry Date
            <input
              type="date"
              value={form.expiryDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  expiryDate: event.target.value,
                }))
              }
            />
          </label>

          {mode === "create" && (
            <label>
              Last Restocked
              <input
                type="date"
                value={form.lastRestocked}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    lastRestocked: event.target.value,
                  }))
                }
              />
            </label>
          )}

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

          <label>
            Tags
            <input
              value={form.tags}
              placeholder="example: gloves, freezer, order"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  tags: event.target.value,
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
            {saving
              ? "Saving..."
              : mode === "create"
                ? "Add Stock Item"
                : "Save Stock Item"}
          </button>
        </div>
      </form>
    </section>
  );
}
