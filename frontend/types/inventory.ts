export type View = "dashboard" | "orders" | "add" | "audit";

export type Status =
  | "high"
  | "low"
  | "critical"
  | "out"
  | "transit"
  | "expiring";

export type InventoryItem = {
  id: number;
  no: number;
  itemName: string;
  category: string;
  brand: string;
  catalogueNum: string;
  lotNum: string;
  shelfNum: string;
  storageId: string;
  quantity: number;
  expiryDate: string;
  status: Status;
};

export type Order = {
  id: number;
  dateOrdered: string;
  itemName: string;
  supplier: string;
  totalPrice: string;
  pricePerUnit: string;
  catalogueNum: string;
  unitsOrdered: string;
  expiryDate: string;
  delivered: boolean;
  dateDelivered?: string;
};

export type AuditLog = {
  id: number;
  username: string;
  action: string;
  itemId: number | null;
  details: string | null;
  timestamp: string;
  oldQuantity: number | null;
  changeAmount: number | null;
  newQuantity: number | null;
};

export const STATUS_LABEL: Record<Status, string> = {
  high: "High",
  low: "Low",
  critical: "Critical",
  out: "Out of Stock",
  transit: "In Transit",
  expiring: "Expiring",
};

export const ITEM_TYPES = [
  "Gloves (Small)",
  "Gloves (Medium)",
  "Gloves (Large)",
  "High Sensitivity Screen Tape",
  "HS2 DNA Reagent Kit",
  "Pipettes (200 ml)",
  "Pipettes (20 ml)",
  "Face Masks (N95)",
  "Sanitizer Gel (500ml)",
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 1,
    no: 155,
    itemName: "Gloves (Small)",
    category: "Consumables",
    brand: "Fisher",
    catalogueNum: "Q32856",
    lotNum: "321",
    shelfNum: "A1",
    storageId: "Freezer 1",
    quantity: 23,
    expiryDate: "08-09-2026",
    status: "high",
  },
  {
    id: 2,
    no: 154,
    itemName: "Pipettes (200 ml)",
    category: "Consumables",
    brand: "Eppendorf",
    catalogueNum: "P200",
    lotNum: "919",
    shelfNum: "B2",
    storageId: "Cabinet 2",
    quantity: 9,
    expiryDate: "08-09-2026",
    status: "low",
  },
  {
    id: 3,
    no: 153,
    itemName: "Pipettes (20 ml)",
    category: "Consumables",
    brand: "Eppendorf",
    catalogueNum: "P20",
    lotNum: "733",
    shelfNum: "B2",
    storageId: "Cabinet 2",
    quantity: 0,
    expiryDate: "08-09-2026",
    status: "out",
  },
  {
    id: 4,
    no: 152,
    itemName: "Gloves (Large)",
    category: "Consumables",
    brand: "Fisher",
    catalogueNum: "GL-L",
    lotNum: "122",
    shelfNum: "A2",
    storageId: "Shelf 4",
    quantity: 2,
    expiryDate: "08-09-2026",
    status: "transit",
  },
  {
    id: 5,
    no: 151,
    itemName: "High Sensitivity Screen Tape",
    category: "Consumables",
    brand: "Agilent",
    catalogueNum: "5067-5584",
    lotNum: "556",
    shelfNum: "C1",
    storageId: "Cold Room",
    quantity: 1,
    expiryDate: "NA",
    status: "critical",
  },
  {
    id: 6,
    no: 150,
    itemName: "HS2 DNA Reagent Kit",
    category: "Reagent",
    brand: "Agilent",
    catalogueNum: "5067-4627",
    lotNum: "901",
    shelfNum: "C3",
    storageId: "Freezer 2",
    quantity: 23,
    expiryDate: "07-09-2026",
    status: "expiring",
  },
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 1,
    dateOrdered: "07-02-2026",
    itemName: "Gloves (Small)",
    supplier: "Fisher Scientific",
    totalPrice: "2000",
    pricePerUnit: "100",
    catalogueNum: "Q32856",
    unitsOrdered: "12",
    expiryDate: "08-09-2026",
    delivered: false,
  },
  {
    id: 2,
    dateOrdered: "07-02-2026",
    itemName: "Pipettes (200 ml)",
    supplier: "Fisher Scientific",
    totalPrice: "1200",
    pricePerUnit: "100",
    catalogueNum: "P200",
    unitsOrdered: "12",
    expiryDate: "08-09-2026",
    delivered: false,
  },
];

export const INITIAL_HISTORY: Order[] = [
  {
    id: 10,
    dateOrdered: "07-02-2026",
    itemName: "Gloves (Small)",
    supplier: "Fisher Scientific",
    totalPrice: "2000",
    pricePerUnit: "100",
    catalogueNum: "Q32856",
    unitsOrdered: "12",
    expiryDate: "08-09-2026",
    delivered: true,
    dateDelivered: "07-01-2026",
  },
  {
    id: 11,
    dateOrdered: "07-15-2026",
    itemName: "Face Masks (N95)",
    supplier: "MedSupply Co.",
    totalPrice: "3500",
    pricePerUnit: "50",
    catalogueNum: "F94721",
    unitsOrdered: "70",
    expiryDate: "07-30-2026",
    delivered: true,
    dateDelivered: "07-01-2026",
  },
];

export function emojiFor(name: string) {
  const value = name.toLowerCase();

  if (value.includes("glove")) return "🧤";
  if (value.includes("pipette")) return "💉";
  if (value.includes("tape")) return "🎞️";
  if (value.includes("reagent") || value.includes("dna")) return "🧪";
  if (value.includes("mask")) return "😷";
  if (value.includes("sanitizer")) return "🧴";

  return "📦";
}

export function getStatusFromQuantity(quantity: number): Status {
  if (quantity <= 0) return "out";
  if (quantity <= 1) return "critical";
  if (quantity <= 10) return "low";

  return "high";
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function toDisplayDate(value: string) {
  if (!value) return "";

  const parts = value.split("-");

  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[1]}-${parts[2]}-${parts[0]}`;
  }

  return value;
}