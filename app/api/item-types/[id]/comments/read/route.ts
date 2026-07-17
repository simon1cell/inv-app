import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const itemTypeId = parseInt(id);
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    if (isNaN(itemTypeId)) {
      return NextResponse.json({ detail: "Invalid item type ID" }, { status: 400 });
    }

    const username = payload.username;

    // Get all items under this item type
    const items = await prisma.item.findMany({
      where: { item_type_id: itemTypeId, is_archived: false },
      select: { catalogue_num: true },
    });

    let marked = 0;
    for (const item of items) {
      const existing = await prisma.itemCommentRead.findFirst({
        where: {
          username,
          item_id: item.catalogue_num,
        },
      });

      if (existing) {
        await prisma.itemCommentRead.update({
          where: { id: existing.id },
          data: { last_seen_at: new Date() },
        });
      } else {
        await prisma.itemCommentRead.create({
          data: {
            username,
            item_id: item.catalogue_num,
            last_seen_at: new Date(),
          },
        });
      }
      marked++;
    }

    return NextResponse.json({ message: "Comments marked read", marked_read: marked });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
