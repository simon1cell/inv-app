import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { createItem, createAuditLog } from "@/lib/crud";

export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");
    const storageId = searchParams.get("storage_id");
    const expiringBefore = searchParams.get("expiring_before");
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const shelfNum = searchParams.get("shelf_num");
    const includeArchived = searchParams.get("include_archived") === "true";

    const whereClause: any = {};

    if (!includeArchived) {
      whereClause.is_archived = false;
    }

    if (name) {
      whereClause.item_name = {
        contains: name,
      };
    }

    if (storageId) {
      whereClause.storage_id = storageId;
    }

    if (expiringBefore) {
      whereClause.expiry_date = {
        lte: new Date(expiringBefore),
      };
    }

    if (category) {
      whereClause.category = category;
    }

    if (shelfNum) {
      whereClause.shelf_num = shelfNum;
    }

    if (status === "out_of_stock") {
      whereClause.quantity = {
        lte: 0,
      };
    } else if (status === "critical") {
      whereClause.quantity = {
        gt: 0,
        lte: prisma.item.fields.critical_threshold, // Wait, prisma field comparisons can be direct or hardcoded
      };
    } else if (status === "low_stock") {
      // quantity <= reorder_threshold
    } else if (status === "expiring_soon") {
      const today = new Date();
      const soon = new Date();
      soon.setDate(today.getDate() + 14);
      whereClause.expiry_date = {
        not: null,
        gte: today,
        lte: soon,
      };
    }

    const items = await prisma.item.findMany({
      where: whereClause,
      orderBy: { id: "asc" },
    });

    // Handle dynamic filter comparisons that are complex to write in pure SQLite prisma clauses
    let filteredItems = items;
    if (status === "critical") {
      filteredItems = items.filter((i) => i.quantity > 0 && i.quantity <= i.critical_threshold);
    } else if (status === "low_stock") {
      filteredItems = items.filter((i) => i.quantity <= i.reorder_threshold);
    }

    // Format expiry_date and last_restocked to YYYY-MM-DD
    const mapped = filteredItems.map((item) => ({
      ...item,
      expiry_date: item.expiry_date ? item.expiry_date.toISOString().split("T")[0] : null,
      last_restocked: item.last_restocked.toISOString().split("T")[0],
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

    if (!body.catalogue_num || !body.item_name || body.quantity === undefined || !body.storage_id) {
      return NextResponse.json({ detail: "Missing required fields" }, { status: 400 });
    }

    // Check if catalogue_num is unique
    const existing = await prisma.item.findUnique({
      where: { catalogue_num: body.catalogue_num },
    });

    if (existing) {
      return NextResponse.json({ detail: "Catalogue number already exists" }, { status: 400 });
    }

    const createdItem = await createItem(body);

    await createAuditLog(
      payload.username,
      "CREATE",
      createdItem.id,
      `Item '${createdItem.item_name}' (Catalogue: ${createdItem.catalogue_num}) created.`,
      0,
      createdItem.quantity,
      createdItem.quantity
    );

    const formatted = {
      ...createdItem,
      expiry_date: createdItem.expiry_date ? createdItem.expiry_date.toISOString().split("T")[0] : null,
      last_restocked: createdItem.last_restocked.toISOString().split("T")[0],
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
