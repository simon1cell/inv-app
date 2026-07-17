import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { getOrCreateItemTypeByName, createAuditLog } from "@/lib/crud";
import * as XLSX from "xlsx";

const HEADER_ALIASES: Record<string, string> = {
  "date": "order_date",
  "order placed by": "order_placed_by",
  "po number": "po_number",
  "vendor": "vendor",
  "category": "category",
  "catalog no.": "catalog_no",
  "catalog no": "catalog_no",
  "catalog number": "catalog_no",
  "item name": "item_name",
  "# of units": "units_ordered",
  "units ordered": "units_ordered",
  "price / unit": "price_per_unit",
  "price per unit": "price_per_unit",
  "total price": "total_price",
  "final price (with tax & freight)": "final_price",
  "final price": "final_price",
  "availability": "availability",
  "expected delivery date": "expected_delivery_date",
  "order #": "order_number",
  "order number": "order_number",
  "delivery date": "delivery_date",
  "status": "status",
  "received by": "received_by",
  "dated paid": "date_paid",
  "date paid": "date_paid",
  "amount paid": "amount_paid",
  "cc/invoice?": "cc_invoice",
  "cc invoice": "cc_invoice",
};

function normalizeHeader(val: any): string {
  return String(val || "").trim().toLowerCase();
}

function cleanString(val: any): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === "" ? null : s;
}

function parseFloatValue(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return val;
  const s = String(val)
    .toLowerCase()
    .replace("$", "")
    .replace(/,/g, "")
    .replace("usd", "")
    .trim();
  
  const emptyValues = ["na", "n/a", "none", "null", "varies", "variable", "tbd", "unknown", "pending", "-", "--"];
  if (emptyValues.includes(s)) return null;

  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

function parseIntValue(val: any): number | null {
  const f = parseFloatValue(val);
  return f === null ? null : Math.floor(f);
}

function parseDateValue(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  // If it's a serial number from excel
  if (typeof val === "number" && val > 20000) {
    return new Date((val - 25569) * 86400 * 1000);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function stripListPrefix(text: string, index: number): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^\s*\d+\s*[\.\)]\s*/, "");
  cleaned = cleaned.replace(/^\s*\d+\s+/, "");
  
  if (index !== undefined) {
    const expected = String(index + 1);
    if (cleaned.startsWith(expected) && cleaned.length > expected.length) {
      const rest = cleaned.substring(expected.length);
      if (/^[a-zA-Z]/.test(rest)) {
        cleaned = rest.trim();
      }
    }
  }
  return cleaned.replace(/^[\s\-;\t]+|[\s\-;\t]+$/g, "");
}

function splitMultivalueCell(val: any): string[] {
  if (val === null || val === undefined || val === "") return [];
  const text = String(val).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!text) return [];

  const parts = text.split("\n").filter((p) => p.trim() !== "");
  return parts.map((part, index) => stripListPrefix(part, index)).filter(Boolean);
}

function splitUnits(val: any, count: number): (number | null)[] {
  if (count <= 1) {
    return [parseIntValue(val)];
  }
  if (val === null || val === undefined || val === "") {
    return Array(count).fill(null);
  }

  const text = String(val).trim();
  if (text.includes("\n")) {
    const parts = splitMultivalueCell(text);
    const nums = parts.map((p) => parseIntValue(p));
    if (nums.length === count) return nums;
  }

  if (/^\d+$/.test(text) && text.length === count && count > 1) {
    return text.split("").map((c) => parseInt(c));
  }

  return Array(count).fill(null);
}

function isServiceOrder(payload: any): boolean {
  const combined = [
    payload.vendor,
    payload.category,
    payload.catalog_no,
    payload.item_name,
    payload.po_number,
    payload.order_number,
  ]
    .map((v) => String(v || "").toLowerCase())
    .join(" ");

  const serviceKeywords = [
    "service",
    "services",
    "software",
    "subscription",
    "license",
    "licence",
    "monthly",
    "annual",
    "microsoft",
    "cloud",
    "hosting",
    "internet",
    "it support",
  ];

  return serviceKeywords.some((keyword) => combined.includes(keyword));
}

function expandOrderPayload(rawPayload: any, rawUnitsValue: any): any[] {
  const catalogParts = splitMultivalueCell(rawPayload.catalog_no);
  const itemParts = splitMultivalueCell(rawPayload.item_name);

  if (catalogParts.length === 0) return [];

  const count = catalogParts.length;
  const unitParts = splitUnits(rawUnitsValue, count);
  const expanded: any[] = [];

  for (let index = 0; index < count; index++) {
    const catalogNo = catalogParts[index];
    let itemName = rawPayload.item_name;
    if (itemParts.length === count) {
      itemName = itemParts[index];
    }
    itemName = cleanString(itemName);

    if (!itemName) continue;

    const child = { ...rawPayload };
    child.catalog_no = catalogNo;
    child.item_name = itemName;
    child.units_ordered = index < unitParts.length ? unitParts[index] : null;

    if (count > 1 && index > 0) {
      child.price_per_unit = null;
      child.total_price = null;
      child.final_price = null;
      child.amount_paid = null;
    }

    expanded.push(child);
  }

  return expanded;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    if (payload.role !== "admin") {
      return NextResponse.json({ detail: "Not authorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ detail: "No file uploaded" }, { status: 400 });
    }

    const filename = file.name || "";
    if (!filename.endsWith(".xlsx") && !filename.endsWith(".xlsm")) {
      return NextResponse.json({ detail: "Please upload an .xlsx or .xlsm file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: "array", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];

    // Read sheet as double array
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    if (rows.length === 0) {
      return NextResponse.json([]);
    }

    const headers = rows[0];
    const fieldIndexes: Record<string, number> = {};

    headers.forEach((header: any, index: number) => {
      const normalized = normalizeHeader(header);
      const fieldName = HEADER_ALIASES[normalized];
      if (fieldName) {
        fieldIndexes[fieldName] = index;
      }
    });

    if (fieldIndexes["item_name"] === undefined) {
      return NextResponse.json({ detail: "Excel file must include an Item Name column" }, { status: 400 });
    }

    const createdOrders: any[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || row.every((val) => val === null || val === undefined || val === "")) {
        continue;
      }

      const valueFor = (fieldName: string) => {
        const index = fieldIndexes[fieldName];
        if (index === undefined || index >= row.length) return null;
        return row[index];
      };

      const itemName = cleanString(valueFor("item_name"));
      if (!itemName) continue;

      const orderPlacedBy = cleanString(valueFor("order_placed_by"));
      const vendor = cleanString(valueFor("vendor"));
      const category = cleanString(valueFor("category"));
      const catalogNo = cleanString(valueFor("catalog_no"));

      const hasRealOrderIdentifier = !!(orderPlacedBy || vendor || category || catalogNo);
      if (!hasRealOrderIdentifier) continue;

      const rawPayload = {
        order_date: parseDateValue(valueFor("order_date")),
        order_placed_by: orderPlacedBy,
        po_number: cleanString(valueFor("po_number")),
        vendor: vendor,
        category: category,
        catalog_no: catalogNo,
        item_name: itemName,
        units_ordered: parseIntValue(valueFor("units_ordered")),
        price_per_unit: parseFloatValue(valueFor("price_per_unit")),
        total_price: parseFloatValue(valueFor("total_price")),
        final_price: parseFloatValue(valueFor("final_price")),
        availability: cleanString(valueFor("availability")),
        expected_delivery_date: parseDateValue(valueFor("expected_delivery_date")),
        order_number: cleanString(valueFor("order_number")),
        delivery_date: parseDateValue(valueFor("delivery_date")),
        status: cleanString(valueFor("status")) || "Ordered",
        received_by: cleanString(valueFor("received_by")),
        date_paid: parseDateValue(valueFor("date_paid")),
        amount_paid: parseFloatValue(valueFor("amount_paid")),
        cc_invoice: cleanString(valueFor("cc_invoice")),
      };

      if (isServiceOrder(rawPayload)) continue;

      const expandedPayloads = expandOrderPayload(rawPayload, valueFor("units_ordered"));

      for (const expanded of expandedPayloads) {
        if (isServiceOrder(expanded)) continue;

        let itemTypeId = expanded.item_type_id;
        if (!itemTypeId && expanded.item_name) {
          const itemType = await getOrCreateItemTypeByName(
            expanded.item_name,
            expanded.category,
            expanded.vendor
          );
          itemTypeId = itemType.id;
        }

        const newOrder = await prisma.order.create({
          data: {
            item_type_id: itemTypeId,
            order_date: expanded.order_date,
            order_placed_by: expanded.order_placed_by,
            po_number: expanded.po_number,
            vendor: expanded.vendor,
            category: expanded.category,
            catalog_no: expanded.catalog_no,
            item_name: expanded.item_name,
            units_ordered: expanded.units_ordered,
            price_per_unit: expanded.price_per_unit,
            total_price: expanded.total_price,
            final_price: expanded.final_price,
            availability: expanded.availability,
            expected_delivery_date: expanded.expected_delivery_date,
            order_number: expanded.order_number,
            delivery_date: expanded.delivery_date,
            status: expanded.status,
            received_by: expanded.received_by,
            date_paid: expanded.date_paid,
            amount_paid: expanded.amount_paid,
            cc_invoice: expanded.cc_invoice,
          },
        });

        await prisma.orderEvent.create({
          data: {
            order_id: newOrder.id,
            event_type: "CREATED",
            notes: `Order imported from ${filename}`,
            created_by: payload.username,
          },
        });

        createdOrders.push(newOrder);
      }
    }

    if (createdOrders.length > 0) {
      await createAuditLog(
        payload.username,
        "IMPORT_ORDERS",
        null,
        `Imported ${createdOrders.length} orders from ${filename}`
      );
    }

    const formatted = createdOrders.map((o) => ({
      ...o,
      order_date: o.order_date ? o.order_date.toISOString().split("T")[0] : null,
      expected_delivery_date: o.expected_delivery_date ? o.expected_delivery_date.toISOString().split("T")[0] : null,
      delivery_date: o.delivery_date ? o.delivery_date.toISOString().split("T")[0] : null,
      date_paid: o.date_paid ? o.date_paid.toISOString().split("T")[0] : null,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
