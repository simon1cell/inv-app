import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { parseDate, receiveOrderIntoInventory, createOrderEvent } from "@/lib/crud";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    if (payload.role !== "admin") {
      return NextResponse.json({ detail: "Not authorized" }, { status: 403 });
    }

    if (isNaN(orderId)) {
      return NextResponse.json({ detail: "Invalid order ID" }, { status: 400 });
    }

    const body = await req.json();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ detail: "Order not found" }, { status: 404 });
    }

    const alreadyDelivered = await prisma.orderEvent.findFirst({
      where: { order_id: orderId, event_type: "DELIVERED" },
    });

    const deliveryDate = parseDate(body.delivery_date) || new Date();
    const receivedBy = body.received_by || payload.username;

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "Delivered",
        delivery_date: deliveryDate,
        received_by: receivedBy,
      },
    });

    if (!alreadyDelivered) {
      // Receive units into inventory
      await receiveOrderIntoInventory(updatedOrder);

      await createOrderEvent(
        orderId,
        "DELIVERED",
        body.notes || "Order marked delivered; inventory updated",
        payload.username
      );
    } else {
      await createOrderEvent(
        orderId,
        "UPDATED",
        "Delivery info updated; inventory was not added again",
        payload.username
      );
    }

    const formatted = {
      ...updatedOrder,
      order_date: updatedOrder.order_date ? updatedOrder.order_date.toISOString().split("T")[0] : null,
      expected_delivery_date: updatedOrder.expected_delivery_date ? updatedOrder.expected_delivery_date.toISOString().split("T")[0] : null,
      delivery_date: updatedOrder.delivery_date ? updatedOrder.delivery_date.toISOString().split("T")[0] : null,
      date_paid: updatedOrder.date_paid ? updatedOrder.date_paid.toISOString().split("T")[0] : null,
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
