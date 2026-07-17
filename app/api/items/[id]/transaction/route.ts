import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/crud";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const catalogueNum = decodeURIComponent(id);
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const changeAmountStr = searchParams.get("change_amount");
    if (!changeAmountStr) {
      return NextResponse.json({ detail: "change_amount query parameter is required" }, { status: 400 });
    }

    const changeAmount = parseInt(changeAmountStr);
    if (isNaN(changeAmount) || changeAmount === 0) {
      return NextResponse.json({ detail: "Invalid change_amount value" }, { status: 400 });
    }

    const item = await prisma.item.findUnique({
      where: { catalogue_num: catalogueNum },
    });

    if (!item || item.is_archived) {
      return NextResponse.json({ detail: "Item not found" }, { status: 404 });
    }

    const oldQty = item.quantity;
    const newQty = oldQty + changeAmount;

    if (newQty < 0) {
      return NextResponse.json({ detail: "Not enough quantity available" }, { status: 400 });
    }

    const updated = await prisma.item.update({
      where: { catalogue_num: catalogueNum },
      data: {
        quantity: newQty,
        last_used_at: changeAmount < 0 ? new Date() : undefined,
      },
    });

    const action = changeAmount < 0 ? "USE" : "RESTOCK";
    const details = changeAmount < 0 
      ? `Used ${Math.abs(changeAmount)} units of '${item.item_name}'`
      : `Restocked ${changeAmount} units of '${item.item_name}'`;

    await createAuditLog(
      payload.username,
      action,
      item.id,
      details,
      oldQty,
      changeAmount,
      newQty
    );

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
