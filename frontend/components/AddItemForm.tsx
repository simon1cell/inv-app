"use client";

import { FormEvent, useMemo, useState } from "react";

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
  last_restocked: string;
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
  orders: OrderRecord[];
  onBack: () => void;
  onSubmitItem: (payload: ItemPayload) => Promise<void>;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanBrand(value?: string | null) {
  if (!value || value === "—") return "";
  return value;
}

function sameOrEmpty(values: Array<string | null | undefined>) {
  const cleaned = [...new Set(values.map((value) => value?.trim()).filter(Boolean))];

  if (cleaned.length === 1) {
    return cleaned[0] ?? "";
  }

  return "";
}

function sumUnits(orders: OrderRecord[]) {
  return orders.reduce((total, order) => total + (order.unitsOrdered ?? 0), 0);
}

export default function AddItemForm({
  mode,
  item,
  itemTypes,
  orders,
  onBack,
  onSubmitItem,
}: AddItemFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    itemTypeId: item?.itemTypeId ? String(item.itemTypeId) : "",
    selectedOrderIds: [] as number[],
    itemName: item?.itemName ?? "",
    category: item?.category ?? "Consumables",
    brand: cleanBrand(item?.brand),
    catalogueNum: item?.catalogueNum ?? "",
    lotNum: item?.lotNum === "—" ? "" : item?.lotNum ?? "",
    storageId: item?.storageId === "Imported" ? "" : item?.storageId ?? "",
    shelfNum: item?.shelfNum === "—" ? "" : item?.shelfNum ?? "",
    quantity: item ? String(item.quantity) : "0",
    expiryDate:
      item?.expiryDate && item.expiryDate !== "NA" ? item.expiryDate : "",
    reorderThreshold: "5",
    criticalThreshold: "1",
    tags: item?.tags?.join(", ") ?? "",
  });

  const sortedItemTypes = useMemo(() => {
    return [...itemTypes].sort((a, b) => a.name.localeCompare(b.name));
  }, [itemTypes]);

  const usableOrders = useMemo(() => {
    return [...orders]
      .filter((order) => order.itemName || order.catalogNo)
      .sort((a, b) => {
        const left = a.itemName || "";
        const right = b.itemName || "";
        return left.localeCompare(right);
      });
  }, [orders]);

  const selectedOrders = useMemo(() => {
    const ids = new Set(form.selectedOrderIds);
    return orders.filter((order) => ids.has(order.id));
  }, [form.selectedOrderIds, orders]);

  const formValid = useMemo(() => {
    return Boolean(
      form.itemTypeId &&
        form.itemName &&
        form.catalogueNum &&
        form.storageId &&
        form.quantity !== "",
    );
  }, [form]);

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => {
      const next = {
        ...current,
        [name]: value,
      };

      if (name === "itemTypeId") {
        const itemType = itemTypes.find(
          (candidate) => String(candidate.id) === value,
        );

        if (itemType) {
          next.itemName = next.itemName || itemType.name;
          next.category = next.category || itemType.category || "Uncategorized";
        }
      }

      if (name === "itemName") {
        const itemType = itemTypes.find(
          (candidate) =>
            candidate.name.toLowerCase() === value.trim().toLowerCase(),
        );

        if (itemType) {
          next.itemTypeId = String(itemType.id);
          next.category = next.category || itemType.category || "Uncategorized";
        }
      }

      return next;
    });
  }

  function handleOrderSelection(values: number[]) {
    const selected = orders.filter((order) => values.includes(order.id));

    setForm((current) => {
      let itemTypeId = current.itemTypeId;

      const linkedTypeIds = [
        ...new Set(
          selected
            .map((order) => order.itemTypeId)
            .filter((id): id is number => typeof id === "number"),
        ),
      ];

      if (!itemTypeId && linkedTypeIds.length === 1) {
        itemTypeId = String(linkedTypeIds[0]);
      }

      const matchedType = itemTypes.find(
        (itemType) => String(itemType.id) === itemTypeId,
      );

      const itemName =
        sameOrEmpty(selected.map((order) => order.itemName)) ||
        matchedType?.name ||
        current.itemName;

      const catalogueNum =
        sameOrEmpty(selected.map((order) => order.catalogNo)) ||
        current.catalogueNum;

      const brand =
        sameOrEmpty(selected.map((order) => order.vendor)) ||
        current.brand;

      const category =
        sameOrEmpty(selected.map((order) => order.category)) ||
        matchedType?.category ||
        current.category;

      const quantity = selected.length > 0 ? String(sumUnits(selected)) : current.quantity;

      return {
        ...current,
        selectedOrderIds: values,
        itemTypeId,
        itemName,
        catalogueNum,
        brand,
        category: category || "Uncategorized",
        quantity,
        tags:
          selected.length > 0
            ? "order, received"
            : current.tags,
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formValid) return;

    setSubmitting(true);

    try {
      await onSubmitItem({
        item_type_id: form.itemTypeId ? Number(form.itemTypeId) : null,
        catalogue_num: form.catalogueNum.trim(),
        item_name: form.itemName.trim(),
        lot_num: numberOrNull(form.lotNum),
        quantity: Number(form.quantity),
        storage_id: form.storageId.trim(),
        expiry_date: form.expiryDate || null,
        last_restocked: todayInputValue(),
        brand: form.brand.trim() || null,
        reorder_threshold: Number(form.reorderThreshold || 5),
        critical_threshold: Number(form.criticalThreshold || 1),
        category: form.category.trim() || "Uncategorized",
        shelf_num: form.shelfNum.trim() || null,
        tags: form.tags.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="view active">
      <div className="crumb">
        <span className="root">INVENTORY</span>
        <span>/</span>
        <span className="cur">
          {mode === "edit" ? "Editing Item" : "Adding Item"}
        </span>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-top">
          <h2>{mode === "edit" ? "Edit Inventory Item" : "Add Inventory Item"}</h2>
        </div>

        <div className="grid">
          <div className="field">
            <label>
              Item Type <span className="req-star">*</span>
            </label>
            <div className="control">
              <select
                value={form.itemTypeId}
                onChange={(event) =>
                  updateField("itemTypeId", event.target.value)
                }
                required
              >
                <option value="">Select item type</option>
                {sortedItemTypes.map((itemType) => (
                  <option key={itemType.id} value={itemType.id}>
                    {itemType.name}
                    {itemType.category ? ` · ${itemType.category}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Create / Autofill From Orders</label>
            <div className="control">
              <select
                multiple
                value={form.selectedOrderIds.map(String)}
                onChange={(event) =>
                  handleOrderSelection(
                    Array.from(event.target.selectedOptions).map((option) =>
                      Number(option.value),
                    ),
                  )
                }
              >
                {usableOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    #{order.id} · {order.itemName} · {order.catalogNo ?? "No catalog"} ·{" "}
                    {order.vendor ?? "No vendor"} · {order.unitsOrdered ?? 0} units
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>
              Item Name <span className="req-star">*</span>
            </label>
            <div className="control">
              <input
                list="item-type-name-suggestions"
                value={form.itemName}
                onChange={(event) => updateField("itemName", event.target.value)}
                placeholder="Gloves Small"
                required
              />
            </div>
          </div>

          <div className="field">
            <label>
              Catalog Number <span className="req-star">*</span>
            </label>
            <div className="control">
              <input
                value={form.catalogueNum}
                onChange={(event) =>
                  updateField("catalogueNum", event.target.value)
                }
                placeholder="Q32856"
                required
                disabled={mode === "edit"}
              />
            </div>
          </div>

          <div className="field">
            <label>Category</label>
            <div className="control">
              <input
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
                placeholder="Consumables"
              />
            </div>
          </div>

          <div className="field">
            <label>Brand / Vendor</label>
            <div className="control">
              <input
                value={form.brand}
                onChange={(event) => updateField("brand", event.target.value)}
                placeholder="Fisher Scientific"
              />
            </div>
          </div>

          <div className="field">
            <label>
              Storage <span className="req-star">*</span>
            </label>
            <div className="control">
              <input
                value={form.storageId}
                onChange={(event) =>
                  updateField("storageId", event.target.value)
                }
                placeholder="Freezer 1 / Cabinet 2"
                required
              />
            </div>
          </div>

          <div className="field">
            <label>Shelf #</label>
            <div className="control">
              <input
                value={form.shelfNum}
                onChange={(event) => updateField("shelfNum", event.target.value)}
                placeholder="A1"
              />
            </div>
          </div>

          <div className="field">
            <label>Lot #</label>
            <div className="control">
              <input
                value={form.lotNum}
                onChange={(event) => updateField("lotNum", event.target.value)}
                placeholder="321"
              />
            </div>
          </div>

          <div className="field">
            <label>
              Quantity <span className="req-star">*</span>
            </label>
            <div className="control">
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(event) => updateField("quantity", event.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <label>Expiry Date</label>
            <div className="control">
              <input
                type="date"
                value={form.expiryDate}
                onChange={(event) =>
                  updateField("expiryDate", event.target.value)
                }
              />
            </div>
          </div>

          <div className="field">
            <label>Reorder Threshold</label>
            <div className="control">
              <input
                type="number"
                min="0"
                value={form.reorderThreshold}
                onChange={(event) =>
                  updateField("reorderThreshold", event.target.value)
                }
              />
            </div>
          </div>

          <div className="field">
            <label>Critical Threshold</label>
            <div className="control">
              <input
                type="number"
                min="0"
                value={form.criticalThreshold}
                onChange={(event) =>
                  updateField("criticalThreshold", event.target.value)
                }
              />
            </div>
          </div>

          <div className="field">
            <label>Tags</label>
            <div className="control">
              <input
                value={form.tags}
                onChange={(event) => updateField("tags", event.target.value)}
                placeholder="cold, reagent, priority"
              />
            </div>
          </div>
        </div>

        {selectedOrders.length > 0 && (
          <div className="form-note">
            Using {selectedOrders.length} selected order
            {selectedOrders.length === 1 ? "" : "s"} to autofill this inventory item.
          </div>
        )}

        <div className="form-footer">
          <button type="button" className="btn secondary" onClick={onBack}>
            Back
          </button>

          <button
            type="submit"
            className="btn primary"
            disabled={!formValid || submitting}
          >
            {submitting
              ? "Saving..."
              : mode === "edit"
                ? "Save Changes"
                : "Add Item"}
          </button>
        </div>

        <datalist id="item-type-name-suggestions">
          {itemTypes.map((itemType) => (
            <option key={itemType.id} value={itemType.name}>
              {itemType.category ?? ""}
            </option>
          ))}
        </datalist>
      </form>
    </section>
  );
}