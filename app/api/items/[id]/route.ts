import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { updateItem, deleteItem, createAuditLog } from "@/lib/crud";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const catalogueNum = decodeURIComponent(id);
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    if (payload.role !== "admin") {
      return NextResponse.json({ detail: "Not authorized" }, { status: 403 });
    }

    const body = await req.json();

    const existing = await prisma.item.findUnique({
      where: { catalogue_num: catalogueNum },
    });

    if (!existing) {
      return NextResponse.json({ detail: "Item not found" }, { status: 404 });
    }

    const oldQty = existing.quantity;
    const newQty = body.quantity !== undefined ? Number(body.quantity) : oldQty;
    const qtyChanged = oldQty !== newQty;

    const updated = await updateItem(catalogueNum, body);
    if (!updated) {
      return NextResponse.json({ detail: "Failed to update item" }, { status: 500 });
    }

    if (qtyChanged) {
      await createAuditLog(
        payload.username,
        "UPDATE",
        updated.id,
        `Item '${updated.item_name}' (Catalogue: ${updated.catalogue_num}) quantity updated manually.`,
        oldQty,
        newQty - oldQty,
        newQty
      );
    } else {
      await createAuditLog(
        payload.username,
        "UPDATE",
        updated.id,
        `Item '${updated.item_name}' (Catalogue: ${updated.catalogue_num}) details updated.`,
        oldQty,
        0,
        oldQty
      );
    }

    const formatted = {
      ...updated,
      expiry_date: updated.expiry_date ? updated.expiry_date.toISOString().split("T")[0] : null,
      last_restocked: updated.last_restocked.toISOString().split("T")[0],
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const catalogueNum = decodeURIComponent(id);
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    if (payload.role !== "admin") {
      return NextResponse.json({ detail: "Not authorized" }, { status: 403 });
    }

    const existing = await prisma.item.findUnique({
      where: { catalogue_num: catalogueNum },
    });

    if (!existing || existing.is_archived) {
      return NextResponse.json({ detail: "Item not found" }, { status: 404 });
    }

    const oldQty = existing.quantity;
    const deleted = await deleteItem(catalogueNum);
    if (!deleted) {
      return NextResponse.json({ detail: "Failed to delete item" }, { status: 500 });
    }

    await createAuditLog(
      payload.username,
      "DELETE",
      deleted.id,
      `Item '${deleted.item_name}' (Catalogue: ${deleted.catalogue_num}) archived/deleted.`,
      oldQty,
      -oldQty,
      0
    );

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
