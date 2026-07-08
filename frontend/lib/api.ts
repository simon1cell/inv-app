import {
  getStatusFromQuantity,
  type AuditLog,
  type InventoryItem,
} from "@/types/inventory";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

type TokenResponse = {
  access_token: string;
  token_type?: string;
};

export type CurrentUser = {
  id: number;
  username: string;
  role: string;
};

type BackendItem = {
  id?: number;
  catalogue_num: number;
  item_name: string;
  lot_num: number | null;
  quantity: number;
  storage_id: string;
  expiry_date: string | null;
  last_restocked: string;
  brand?: string | null;
  reorder_threshold?: number | null;
  critical_threshold?: number | null;
  category?: string | null;
  shelf_num?: number | null;
};

type BackendAuditLog = {
  id: number;
  username: string;
  action: string;
  item_id: number | null;
  details: string | null;
  timestamp: string;
  old_quantity: number | null;
  change_amount: number | null;
  new_quantity: number | null;
};

async function getErrorMessage(response: Response) {
  const data = await response.json().catch(() => null);

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((error: { msg?: string }) => error.msg)
      .filter(Boolean)
      .join(", ");
  }

  return `Request failed with status ${response.status}`;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string; json?: unknown } = {},
): Promise<T> {
  const { token, json, headers, ...fetchOptions } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers: {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: json ? JSON.stringify(json) : fetchOptions.body,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

function formatDisplayDate(value: string | null) {
  if (!value) return "NA";

  const parts = value.split("-");

  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[1]}-${parts[2]}-${parts[0]}`;
  }

  return value;
}

function mapItem(item: BackendItem): InventoryItem {
  const quantity = item.quantity;

  const displayId = item.id ?? item.catalogue_num;
  const apiId = item.catalogue_num;

  return {
    id: apiId,
    no: displayId,
    itemName: item.item_name,
    category: item.category ?? "Uncategorized",
    brand: item.brand ?? "—",
    catalogueNum: String(item.catalogue_num),
    lotNum: item.lot_num == null ? "—" : String(item.lot_num),
    shelfNum: item.shelf_num == null ? "—" : String(item.shelf_num),
    storageId: item.storage_id,
    quantity,
    expiryDate: formatDisplayDate(item.expiry_date),
    status: getStatusFromQuantity(quantity),
  };
}

function mapAuditLog(log: BackendAuditLog): AuditLog {
  return {
    id: log.id,
    username: log.username,
    action: log.action,
    itemId: log.item_id,
    details: log.details,
    timestamp: log.timestamp,
    oldQuantity: log.old_quantity,
    changeAmount: log.change_amount,
    newQuantity: log.new_quantity,
  };
}

export async function login(username: string, password: string) {
  const formData = new URLSearchParams();
  formData.set("username", username);
  formData.set("password", password);

  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json() as Promise<TokenResponse>;
}

export function getCurrentUser(token: string) {
  return apiRequest<CurrentUser>("/me", {
    token,
    method: "GET",
  });
}

export async function getItems(token: string) {
  const items = await apiRequest<BackendItem[]>("/items/", {
    token,
    method: "GET",
  });

  return items.map(mapItem);
}

export async function getAuditLogs(token: string) {
  const logs = await apiRequest<BackendAuditLog[]>("/audit-logs/", {
    token,
    method: "GET",
  });

  return logs.map(mapAuditLog);
}

export async function createTransaction(
  token: string,
  itemId: number,
  changeAmount: number,
) {
  const query = new URLSearchParams({
    change_amount: String(changeAmount),
  });

  const item = await apiRequest<BackendItem>(
    `/items/${itemId}/transaction?${query.toString()}`,
    {
      token,
      method: "POST",
    },
  );

  return mapItem(item);
}

export function deleteItem(token: string, itemId: number) {
  return apiRequest<void>(`/items/${itemId}`, {
    token,
    method: "DELETE",
  });
}