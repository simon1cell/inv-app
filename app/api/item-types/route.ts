import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    const itemTypes = await prisma.itemType.findMany({
      include: {
        items: {
          where: { is_archived: false },
        },
      },
    });

    const mapped = itemTypes.map((it) => {
      const total_quantity = it.items.reduce((sum, item) => sum + item.quantity, 0);
      return {
        id: it.id,
        name: it.name,
        category: it.category,
        brand: it.brand,
        reorder_threshold: it.reorder_threshold,
        critical_threshold: it.critical_threshold,
        notes: it.notes,
        total_quantity,
      };
    });

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
    const { name, category, brand, reorder_threshold, critical_threshold, notes } = body;

    if (!name) {
      return NextResponse.json({ detail: "Name is required" }, { status: 400 });
    }

    const itemType = await prisma.itemType.create({
      data: {
        name,
        category,
        brand,
        reorder_threshold: reorder_threshold !== undefined ? Number(reorder_threshold) : 5,
        critical_threshold: critical_threshold !== undefined ? Number(critical_threshold) : 1,
        notes,
      },
    });

    return NextResponse.json({
      ...itemType,
      total_quantity: 0,
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
