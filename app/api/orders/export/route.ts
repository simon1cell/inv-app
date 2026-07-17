import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import * as XLSX from "xlsx";

const ORDER_COLUMNS = [
  { label: "Date", key: "order_date" },
  { label: "Order Placed by", key: "order_placed_by" },
  { label: "PO Number", key: "po_number" },
  { label: "Vendor", key: "vendor" },
  { label: "Category", key: "category" },
  { label: "Catalog No.", key: "catalog_no" },
  { label: "Item Name", key: "item_name" },
  { label: "# of Units", key: "units_ordered" },
  { label: "Price / Unit", key: "price_per_unit" },
  { label: "Total Price", key: "total_price" },
  { label: "Final Price (with tax & freight)", key: "final_price" },
  { label: "Availability", key: "availability" },
  { label: "Expected Delivery Date", key: "expected_delivery_date" },
  { label: "Order #", key: "order_number" },
  { label: "Delivery Date", key: "delivery_date" },
  { label: "Status", key: "status" },
  { label: "Received by", key: "received_by" },
  { label: "Date paid", key: "date_paid" },
  { label: "Amount Paid", key: "amount_paid" },
  { label: "CC/Invoice?", key: "cc_invoice" },
];

function formatDate(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    if (payload.role !== "admin") {
      return NextResponse.json({ detail: "Not authorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const idsStr = searchParams.get("ids");
    let orders: any[] = [];

    if (idsStr) {
      const ids = idsStr.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
      orders = await prisma.order.findMany({
        where: { id: { in: ids } },
        orderBy: { order_date: "desc" },
      });
    } else {
      orders = await prisma.order.findMany({
        orderBy: { order_date: "desc" },
      });
    }

    // Build SheetJS workbook
    const headers = ORDER_COLUMNS.map((col) => col.label);
    const dataRows = orders.map((order) => {
      return ORDER_COLUMNS.map((col) => {
        const val = order[col.key];
        if (val instanceof Date) {
          return formatDate(val);
        }
        return val === null || val === undefined ? "" : val;
      });
    });

    const sheetData = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");

    // Write binary buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const response = new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="orders.xlsx"',
      },
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
