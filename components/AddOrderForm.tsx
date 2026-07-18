"use client";

import { FormEvent, useMemo, useState } from "react";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  todayInputValue,
  type InventoryItem,
  type ItemType,
  type Order,
} from "@/types/inventory";

type AddOrderFormProps = {
  initialItem?: InventoryItem | null;
  inventoryItems: InventoryItem[];
  itemTypes: ItemType[];
  onBack: () => void;
  onSubmitOrder: (order: Order) => void;
};

function moneyString(value: number) {
  if (!Number.isFinite(value)) return "";
  return String(Number(value.toFixed(2)));
}

function cleanBrand(value?: string | null) {
  if (!value || value === "—") return "";
  return value;
}

export default function AddOrderForm({
  initialItem,
  inventoryItems,
  itemTypes,
  onBack,
  onSubmitOrder,
}: AddOrderFormProps) {
  const [finalPriceTouched, setFinalPriceTouched] = useState(false);

  const [form, setForm] = useState({
    itemTypeId: initialItem?.itemTypeId ? String(initialItem.itemTypeId) : "",
    existingItemId: initialItem?.id ?? "",
    dateOrdered: todayInputValue(),
    orderPlacedBy: "",
    poNumber: "",
    vendor: cleanBrand(initialItem?.brand),
    category: initialItem?.category ?? "",
    catalogNo: initialItem?.catalogueNum ?? "",
    itemName: initialItem?.itemName ?? "",
    unitsOrdered: "",
    pricePerUnit: "",
    totalPrice: "",
    finalPrice: "",
    availability: "",
    expectedDeliveryDate: "",
    orderNumber: "",
    deliveryDate: "",
    status: "Ordered",
    receivedBy: "",
    datePaid: "",
    amountPaid: "",
    ccInvoice: "",
  });

  const delivered = form.status === "Delivered" || Boolean(form.deliveryDate);

  const formValid = useMemo(() => {
    return Boolean(
      form.itemTypeId &&
        form.dateOrdered &&
        form.vendor &&
        form.catalogNo &&
        form.itemName &&
        form.unitsOrdered &&
        form.pricePerUnit &&
        form.totalPrice,
    );
  }, [form]);

  const sortedItemTypes = useMemo(() => {
    return [...itemTypes].sort((a, b) => a.name.localeCompare(b.name));
  }, [itemTypes]);

  const sortedInventoryItems = useMemo(() => {
    return [...inventoryItems].sort((a, b) =>
      a.itemName.localeCompare(b.itemName),
    );
  }, [inventoryItems]);

  function findInventoryMatch(name: keyof typeof form, value: string) {
    const normalized = value.trim().toLowerCase();

    if (!normalized) return null;

    if (name === "catalogNo") {
      return (
        inventoryItems.find(
          (item) => item.catalogueNum.toLowerCase() === normalized,
        ) ?? null
      );
    }

    if (name === "itemName") {
      return (
        inventoryItems.find(
          (item) => item.itemName.toLowerCase() === normalized,
        ) ?? null
      );
    }

    return null;
  }

  function findItemTypeByName(value: string) {
    const normalized = value.trim().toLowerCase();

    if (!normalized) return null;

    return (
      itemTypes.find((itemType) => itemType.name.toLowerCase() === normalized) ??
      null
    );
  }

  function applyInventoryItem(
    next: typeof form,
    item: InventoryItem,
  ): typeof form {
    return {
      ...next,
      existingItemId: item.id,
      itemTypeId: item.itemTypeId ? String(item.itemTypeId) : next.itemTypeId,
      itemName: item.itemName,
      catalogNo: item.catalogueNum,
      vendor: cleanBrand(item.brand),
      category: item.category,
    };
  }

  function applyItemType(next: typeof form, itemType: ItemType): typeof form {
    return {
      ...next,
      itemTypeId: String(itemType.id),
      itemName: next.itemName || itemType.name,
      category: next.category || itemType.category || "",
    };
  }

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => {
      let next = {
        ...current,
        [name]: value,
      };

      if (name === "existingItemId") {
        const item = inventoryItems.find((candidate) => candidate.id === value);

        if (item) {
          next = applyInventoryItem(next, item);
        }
      }

      if (name === "itemTypeId") {
        const itemType = itemTypes.find(
          (candidate) => String(candidate.id) === value,
        );

        if (itemType) {
          next = applyItemType(next, itemType);
        }
      }

      const inventoryMatch = findInventoryMatch(name, value);

      if (inventoryMatch) {
        next = applyInventoryItem(next, inventoryMatch);
      }

      if (name === "itemName") {
        const itemTypeMatch = findItemTypeByName(value);

        if (itemTypeMatch) {
          next = applyItemType(next, itemTypeMatch);
        }
      }

      if (name === "finalPrice") {
        setFinalPriceTouched(true);
      }

      const units = Number(
        name === "unitsOrdered" ? value : next.unitsOrdered,
      );

      const price = Number(
        name === "pricePerUnit" ? value : next.pricePerUnit,
      );

      const total = Number(name === "totalPrice" ? value : next.totalPrice);

      if (name === "unitsOrdered" || name === "pricePerUnit") {
        if (Number.isFinite(units) && units > 0 && Number.isFinite(price)) {
          const computedTotal = moneyString(units * price);
          next.totalPrice = computedTotal;

          if (!finalPriceTouched) {
            next.finalPrice = computedTotal;
          }
        }
      }

      if (name === "totalPrice") {
        if (Number.isFinite(units) && units > 0 && Number.isFinite(total)) {
          next.pricePerUnit = moneyString(total / units);
        }

        if (!finalPriceTouched) {
          next.finalPrice = value;
        }
      }

      if (name === "status" && value === "Delivered" && !next.deliveryDate) {
        next.deliveryDate = todayInputValue();
      }

      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formValid) return;

    onSubmitOrder({
      id: Date.now(),
      itemTypeId: Number(form.itemTypeId),

      dateOrdered: form.dateOrdered,
      orderPlacedBy: form.orderPlacedBy,
      poNumber: form.poNumber,
      supplier: form.vendor,
      category: form.category,
      catalogueNum: form.catalogNo,
      itemName: form.itemName,

      unitsOrdered: form.unitsOrdered,
      pricePerUnit: form.pricePerUnit,
      totalPrice: form.totalPrice,
      finalPrice: form.finalPrice,

      availability: form.availability,
      expectedDeliveryDate: form.expectedDeliveryDate,
      orderNumber: form.orderNumber,
      dateDelivered: form.deliveryDate || undefined,
      status: form.status,
      receivedBy: form.receivedBy,
      datePaid: form.datePaid,
      amountPaid: form.amountPaid,
      ccInvoice: form.ccInvoice,

      expiryDate: form.expectedDeliveryDate,
      delivered,
    });
  }

  return (
    <section className="view active">
      <div className="crumb">
        <span className="root">ORDERS</span>
        <span>/</span>
        <span className="cur">Adding Order</span>
      </div>

      <form className="form-card max-w-5xl" onSubmit={handleSubmit}>
        <div className="form-top">
          <h2>Order Information</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 mb-6">
          <div className="field col-span-1 sm:col-span-2">
            <label>
              Item Type <span className="req-star">*</span>
            </label>
            <div className="control">
              <select
                value={form.itemTypeId}
                onChange={(event) =>
                  updateField("itemTypeId", event.target.value)
                }
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

          <div className="field col-span-1 sm:col-span-2">
            <label>Autofill From Existing Item</label>
            <div className="control">
              <select
                value={form.existingItemId}
                onChange={(event) =>
                  updateField("existingItemId", event.target.value)
                }
              >
                <option value="">Select existing item</option>
                {sortedInventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.itemName} · {item.catalogueNum} · {item.brand}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>
              Date <span className="req-star">*</span>
            </label>
            <div className="control">
              <input
                type="date"
                value={form.dateOrdered}
                onChange={(event) =>
                  updateField("dateOrdered", event.target.value)
                }
              />
            </div>
          </div>

          <div className="field">
            <label>Order Placed By</label>
            <div className="control">
              <input
                placeholder="Sankar, labtech1..."
                value={form.orderPlacedBy}
                onChange={(event) =>
                  updateField("orderPlacedBy", event.target.value)
                }
              />
            </div>
          </div>

          <div className="field">
            <label>PO Number</label>
            <div className="control">
              <input
                placeholder="20260707-..."
                value={form.poNumber}
                onChange={(event) => updateField("poNumber", event.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>
              Vendor <span className="req-star">*</span>
            </label>
            <div className="control">
              <input
                list="vendor-suggestions"
                placeholder="Fisher Scientific"
                value={form.vendor}
                onChange={(event) => updateField("vendor", event.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>Category</label>
            <div className="control">
              <input
                list="category-suggestions"
                placeholder="Consumables, Reagent..."
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>
              Catalog No. <span className="req-star">*</span>
            </label>
            <div className="control">
              <input
                list="catalog-number-suggestions"
                placeholder="Q32856"
                value={form.catalogNo}
                onChange={(event) =>
                  updateField("catalogNo", event.target.value)
                }
              />
            </div>
          </div>

          <div className="field col-span-1 sm:col-span-2">
            <label>
              Item Name <span className="req-star">*</span>
            </label>
            <div className="control">
              <input
                list="item-name-suggestions"
                placeholder="Gloves, assay tubes, reagent kit..."
                value={form.itemName}
                onChange={(event) => updateField("itemName", event.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>
              # of Units <span className="req-star">*</span>
            </label>
            <div className="control">
              <input
                type="number"
                min="0"
                placeholder="12"
                value={form.unitsOrdered}
                onChange={(event) =>
                  updateField("unitsOrdered", event.target.value)
                }
              />
            </div>
          </div>

          <div className="field">
            <label>
              Price / Unit <span className="req-star">*</span>
            </label>
            <div className="control">
              <span className="prefix">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="100"
                value={form.pricePerUnit}
                onChange={(event) =>
                  updateField("pricePerUnit", event.target.value)
                }
              />
              <span className="suffix">USD</span>
            </div>
          </div>

          <div className="field">
            <label>
              Total Price <span className="req-star">*</span>
            </label>
            <div className="control">
              <span className="prefix">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="1200"
                value={form.totalPrice}
                onChange={(event) =>
                  updateField("totalPrice", event.target.value)
                }
              />
              <span className="suffix">USD</span>
            </div>
          </div>

          <div className="field">
            <label>Final Price with Tax/Freight</label>
            <div className="control">
              <span className="prefix">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Final total"
                value={form.finalPrice}
                onChange={(event) =>
                  updateField("finalPrice", event.target.value)
                }
              />
              <span className="suffix">USD</span>
            </div>
          </div>

          <div className="field">
            <label>Availability</label>
            <div className="control">
              <input
                placeholder="In stock, backordered, unavailable..."
                value={form.availability}
                onChange={(event) =>
                  updateField("availability", event.target.value)
                }
              />
            </div>
          </div>

          <div className="field">
            <label>Expected Delivery Date</label>
            <div className="control">
              <input
                type="date"
                value={form.expectedDeliveryDate}
                onChange={(event) =>
                  updateField("expectedDeliveryDate", event.target.value)
                }
              />
            </div>
          </div>

          <div className="field">
            <label>Order #</label>
            <div className="control">
              <input
                placeholder="260336"
                value={form.orderNumber}
                onChange={(event) =>
                  updateField("orderNumber", event.target.value)
                }
              />
            </div>
          </div>

          <div className="field">
            <label>Delivery Date</label>
            <div className="control">
              <input
                type="date"
                value={form.deliveryDate}
                onChange={(event) =>
                  updateField("deliveryDate", event.target.value)
                }
              />
            </div>
          </div>

          <div className="field">
            <label>Status</label>
            <div className="control">
              <select
                value={form.status}
                onChange={(event) => updateField("status", event.target.value)}
              >
                <option value="Ordered">Ordered</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Invoice Received">Invoice Received</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Received By</label>
            <div className="control">
              <input
                placeholder="Name"
                value={form.receivedBy}
                onChange={(event) =>
                  updateField("receivedBy", event.target.value)
                }
              />
            </div>
          </div>

          <div className="field">
            <label>Date Paid</label>
            <div className="control">
              <input
                type="date"
                value={form.datePaid}
                onChange={(event) => updateField("datePaid", event.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>Amount Paid</label>
            <div className="control">
              <span className="prefix">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount paid"
                value={form.amountPaid}
                onChange={(event) =>
                  updateField("amountPaid", event.target.value)
                }
              />
              <span className="suffix">USD</span>
            </div>
          </div>

          <div className="field col-span-1 sm:col-span-2">
            <label>CC/Invoice?</label>
            <div className="control">
              <input
                placeholder="CC, Invoice, invoice #..."
                value={form.ccInvoice}
                onChange={(event) =>
                  updateField("ccInvoice", event.target.value)
                }
              />
            </div>
          </div>
        </div>

        <div className="form-footer">
          <Button type="button" variant="outline" onClick={onBack} icon={ArrowLeft} text="Back" />
          <Button type="submit" className="btn primary" disabled={!formValid} text="Submit Order" />
        </div>

        <datalist id="item-name-suggestions">
          {inventoryItems.map((item) => (
            <option key={item.id} value={item.itemName}>
              {item.catalogueNum}
            </option>
          ))}

          {itemTypes.map((itemType) => (
            <option key={`type-${itemType.id}`} value={itemType.name}>
              {itemType.category ?? ""}
            </option>
          ))}
        </datalist>

        <datalist id="catalog-number-suggestions">
          {inventoryItems.map((item) => (
            <option key={item.id} value={item.catalogueNum}>
              {item.itemName}
            </option>
          ))}
        </datalist>

        <datalist id="vendor-suggestions">
          {[...new Set(inventoryItems.map((item) => item.brand).filter(Boolean))]
            .filter((brand) => brand !== "—")
            .map((brand) => (
              <option key={brand} value={brand} />
            ))}
        </datalist>

        <datalist id="category-suggestions">
          {[
            ...new Set([
              ...inventoryItems.map((item) => item.category),
              ...itemTypes.map((itemType) => itemType.category ?? ""),
            ]),
          ]
            .filter(Boolean)
            .map((category) => (
              <option key={category} value={category} />
            ))}
        </datalist>
      </form>
    </section>
  );
}