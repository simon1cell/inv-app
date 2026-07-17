import { prisma } from "./prisma";
import { hashPassword } from "./auth";

// helper to format dates from client
export function parseDate(val: string | Date | null | undefined): Date | null {
  if (!val) return null;
  return new Date(val);
}

export function parseDateRequired(val: string | Date): Date {
  return new Date(val);
}

export async function getOrCreateItemTypeByName(
  name: string,
  category?: string | null,
  brand?: string | null
) {
  const cleanedName = name.trim();
  const existing = await prisma.itemType.findFirst({
    where: {
      name: {
        equals: cleanedName,
      },
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.itemType.create({
    data: {
      name: cleanedName,
      category: category || null,
      brand: brand || null,
      reorder_threshold: 5,
      critical_threshold: 1,
    },
  });
}

export async function createItem(data: any) {
  let itemTypeId = data.item_type_id;

  if (!itemTypeId) {
    const itemType = await getOrCreateItemTypeByName(
      data.item_name,
      data.category,
      data.brand
    );
    itemTypeId = itemType.id;
  }

  return prisma.item.create({
    data: {
      item_type_id: itemTypeId,
      catalogue_num: data.catalogue_num,
      item_name: data.item_name,
      lot_num: data.lot_num !== undefined ? Number(data.lot_num) : null,
      quantity: Number(data.quantity),
      storage_id: data.storage_id,
      expiry_date: parseDate(data.expiry_date),
      last_restocked: parseDateRequired(data.last_restocked || new Date()),
      brand: data.brand,
      reorder_threshold: data.reorder_threshold !== undefined ? Number(data.reorder_threshold) : 5,
      critical_threshold: data.critical_threshold !== undefined ? Number(data.critical_threshold) : 1,
      category: data.category || "Uncategorized",
      shelf_num: data.shelf_num || null,
      tags: data.tags || "",
      last_used_at: parseDate(data.last_used_at),
      is_archived: data.is_archived || false,
    },
  });
}

export async function getItems() {
  return prisma.item.findMany({
    where: { is_archived: false },
    orderBy: { id: "asc" },
  });
}

export async function getItemByCatalogueNum(catalogueNum: string) {
  return prisma.item.findUnique({
    where: { catalogue_num: catalogueNum },
  });
}

export async function deleteItem(catalogueNum: string) {
  const item = await getItemByCatalogueNum(catalogueNum);
  if (!item || item.is_archived) {
    return null;
  }

  const tagsList = item.tags ? item.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  if (!tagsList.includes("archived")) {
    tagsList.push("archived");
  }

  return prisma.item.update({
    where: { catalogue_num: catalogueNum },
    data: {
      is_archived: true,
      quantity: 0,
      tags: tagsList.join(","),
    },
  });
}

export async function updateItem(catalogueNum: string, data: any) {
  const item = await getItemByCatalogueNum(catalogueNum);
  if (!item) return null;

  return prisma.item.update({
    where: { catalogue_num: catalogueNum },
    data: {
      item_type_id: data.item_type_id !== undefined ? data.item_type_id : undefined,
      item_name: data.item_name !== undefined ? data.item_name : undefined,
      lot_num: data.lot_num !== undefined ? (data.lot_num !== null ? Number(data.lot_num) : null) : undefined,
      quantity: data.quantity !== undefined ? Number(data.quantity) : undefined,
      storage_id: data.storage_id !== undefined ? data.storage_id : undefined,
      expiry_date: data.expiry_date !== undefined ? parseDate(data.expiry_date) : undefined,
      last_restocked: data.last_restocked !== undefined ? parseDateRequired(data.last_restocked) : undefined,
      brand: data.brand !== undefined ? data.brand : undefined,
      reorder_threshold: data.reorder_threshold !== undefined ? Number(data.reorder_threshold) : undefined,
      critical_threshold: data.critical_threshold !== undefined ? Number(data.critical_threshold) : undefined,
      category: data.category !== undefined ? data.category : undefined,
      shelf_num: data.shelf_num !== undefined ? data.shelf_num : undefined,
      tags: data.tags !== undefined ? data.tags : undefined,
      last_used_at: data.last_used_at !== undefined ? parseDate(data.last_used_at) : undefined,
      is_archived: data.is_archived !== undefined ? data.is_archived : undefined,
    },
  });
}

export async function createAuditLog(
  username: string,
  action: string,
  itemId?: number | null,
  details?: string | null,
  oldQuantity?: number | null,
  changeAmount?: number | null,
  newQuantity?: number | null
) {
  return prisma.auditLog.create({
    data: {
      username,
      action,
      item_id: itemId || null,
      details: details || null,
      old_quantity: oldQuantity !== undefined ? oldQuantity : null,
      change_amount: changeAmount !== undefined ? changeAmount : null,
      new_quantity: newQuantity !== undefined ? newQuantity : null,
    },
  });
}

export async function getAuditLogs() {
  return prisma.auditLog.findMany({
    orderBy: { timestamp: "desc" },
  });
}

export async function createUser(data: any) {
  const hashed = await hashPassword(data.password);
  return prisma.user.create({
    data: {
      username: data.username,
      hashed_password: hashed,
      role: data.role || "user",
    },
  });
}

export async function getOrderById(id: number) {
  return prisma.order.findUnique({
    where: { id },
  });
}

export async function createOrderEvent(
  orderId: number,
  eventType: string,
  notes?: string | null,
  createdBy?: string | null
) {
  return prisma.orderEvent.create({
    data: {
      order_id: orderId,
      event_type: eventType,
      notes: notes || null,
      created_by: createdBy || null,
    },
  });
}

export async function getOrCreateOrderPlaceholderItem(order: any) {
  if (!order.catalog_no) return null;
  const catalogueNum = String(order.catalog_no).trim();
  if (!catalogueNum) return null;

  const existing = await prisma.item.findUnique({
    where: { catalogue_num: catalogueNum },
  });

  if (existing) {
    if (existing.is_archived) {
      await prisma.item.update({
        where: { catalogue_num: catalogueNum },
        data: { is_archived: false },
      });
    }
    return existing;
  }

  let itemTypeId = order.item_type_id;
  if (!itemTypeId) {
    const itemType = await getOrCreateItemTypeByName(
      order.item_name,
      order.category,
      order.vendor
    );
    itemTypeId = itemType.id;
    await prisma.order.update({
      where: { id: order.id },
      data: { item_type_id: itemTypeId },
    });
  }

  return prisma.item.create({
    data: {
      item_type_id: itemTypeId,
      catalogue_num: catalogueNum,
      item_name: order.item_name,
      lot_num: null,
      quantity: 0,
      storage_id: "Pending Order",
      expiry_date: parseDate(order.expected_delivery_date || order.delivery_date),
      last_restocked: parseDateRequired(order.order_date || new Date()),
      brand: order.vendor || "—",
      reorder_threshold: 5,
      critical_threshold: 1,
      category: order.category || "Uncategorized",
      shelf_num: null,
      tags: "order,pending",
      is_archived: false,
    },
  });
}

export async function receiveOrderIntoInventory(order: any) {
  if (!order.catalog_no) return null;
  const catalogueNum = String(order.catalog_no).trim();
  if (!catalogueNum) return null;

  let item = await prisma.item.findUnique({
    where: { catalogue_num: catalogueNum },
  });

  if (!item) {
    item = await getOrCreateOrderPlaceholderItem(order);
  }

  if (!item) return null;

  let itemTypeId = item.item_type_id;
  if (order.item_type_id && !item.item_type_id) {
    itemTypeId = order.item_type_id;
  } else if (!order.item_type_id && !item.item_type_id) {
    const itemType = await getOrCreateItemTypeByName(
      order.item_name,
      order.category,
      order.vendor
    );
    itemTypeId = itemType.id;
  }

  const units = order.units_ordered || 0;
  const newQty = item.quantity + units;

  const currentTags = item.tags ? item.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const tagsSet = new Set(currentTags);
  tagsSet.add("order");
  tagsSet.add("received");
  const newTags = Array.from(tagsSet).join(",");

  return prisma.item.update({
    where: { catalogue_num: catalogueNum },
    data: {
      item_type_id: itemTypeId || undefined,
      is_archived: false,
      quantity: newQty,
      storage_id: item.storage_id === "Pending Order" ? "Imported" : item.storage_id,
      last_restocked: parseDateRequired(order.delivery_date || order.order_date || new Date()),
      tags: newTags,
    },
  });
}
