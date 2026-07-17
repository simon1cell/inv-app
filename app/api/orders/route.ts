import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { parseDate, parseDateRequired, getOrCreateItemTypeByName } from "@/lib/crud";

export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      orderBy: { order_date: "desc" },
    });

    const mapped = orders.map((o) => ({
      ...o,
      order_date: o.order_date ? o.order_date.toISOString().split("T")[0] : null,
      expected_delivery_date: o.expected_delivery_date ? o.expected_delivery_date.toISOString().split("T")[0] : null,
      delivery_date: o.delivery_date ? o.delivery_date.toISOString().split("T")[0] : null,
      date_paid: o.date_paid ? o.date_paid.toISOString().split("T")[0] : null,
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
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

    const body = await req.json();
    let itemTypeId = body.item_type_id;

    if (!itemTypeId && body.item_name) {
      const itemType = await getOrCreateItemTypeByName(
        body.item_name,
        body.category,
        body.vendor
      );
      itemTypeId = itemType.id;
    }

    const order = await prisma.order.create({
      data: {
        item_type_id: itemTypeId,
        order_date: parseDate(body.order_date),
        order_placed_by: body.order_placed_by,
        po_number: body.po_number,
        vendor: body.vendor,
        category: body.category,
        catalog_no: body.catalog_no,
        item_name: body.item_name,
        units_ordered: body.units_ordered !== undefined ? Number(body.units_ordered) : null,
        price_per_unit: body.price_per_unit !== undefined ? Number(body.price_per_unit) : null,
        total_price: body.total_price !== undefined ? Number(body.total_price) : null,
        final_price: body.final_price !== undefined ? Number(body.final_price) : null,
        availability: body.availability,
        expected_delivery_date: parseDate(body.expected_delivery_date),
        order_number: body.order_number,
        status: body.status || "Ordered",
      },
    });

    await prisma.orderEvent.create({
      data: {
        order_id: order.id,
        event_type: "CREATED",
        notes: `Order created by ${payload.username}`,
        created_by: payload.username,
      },
    });

    const formatted = {
      ...order,
      order_date: order.order_date ? order.order_date.toISOString().split("T")[0] : null,
      expected_delivery_date: order.expected_delivery_date ? order.expected_delivery_date.toISOString().split("T")[0] : null,
      delivery_date: order.delivery_date ? order.delivery_date.toISOString().split("T")[0] : null,
      date_paid: order.date_paid ? order.date_paid.toISOString().split("T")[0] : null,
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
