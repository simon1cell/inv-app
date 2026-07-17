import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    if (payload.role !== "admin") {
      return NextResponse.json({ detail: "Not authorized" }, { status: 403 });
    }

    const body = await req.json();
    const itemTypeId = parseInt(id);

    if (isNaN(itemTypeId)) {
      return NextResponse.json({ detail: "Invalid ID" }, { status: 400 });
    }

    const updated = await prisma.itemType.update({
      where: { id: itemTypeId },
      data: {
        name: body.name,
        category: body.category,
        brand: body.brand,
        reorder_threshold: body.reorder_threshold !== undefined ? Number(body.reorder_threshold) : undefined,
        critical_threshold: body.critical_threshold !== undefined ? Number(body.critical_threshold) : undefined,
        notes: body.notes,
      },
      include: {
        items: {
          where: { is_archived: false },
        },
      },
    });

    const total_quantity = updated.items.reduce((sum, item) => sum + item.quantity, 0);

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      category: updated.category,
      brand: updated.brand,
      reorder_threshold: updated.reorder_threshold,
      critical_threshold: updated.critical_threshold,
      notes: updated.notes,
      total_quantity,
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    if (payload.role !== "admin") {
      return NextResponse.json({ detail: "Not authorized" }, { status: 403 });
    }

    const itemTypeId = parseInt(id);
    if (isNaN(itemTypeId)) {
      return NextResponse.json({ detail: "Invalid ID" }, { status: 400 });
    }

    const deleted = await prisma.itemType.delete({
      where: { id: itemTypeId },
    });

    return NextResponse.json({
      id: deleted.id,
      name: deleted.name,
      category: deleted.category,
      brand: deleted.brand,
      reorder_threshold: deleted.reorder_threshold,
      critical_threshold: deleted.critical_threshold,
      notes: deleted.notes,
      total_quantity: 0,
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
