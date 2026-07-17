import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const catalogueNum = decodeURIComponent(id);
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    const username = payload.username;

    // Check if read status already exists, upsert it
    const existing = await prisma.itemCommentRead.findFirst({
      where: {
        username,
        item_id: catalogueNum,
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
          item_id: catalogueNum,
          last_seen_at: new Date(),
        },
      });
    }

    return NextResponse.json({ message: "Comments marked read", marked_read: 1 });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
