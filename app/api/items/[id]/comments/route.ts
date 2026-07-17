import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const catalogueNum = decodeURIComponent(id);
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    const comments = await prisma.itemComment.findMany({
      where: { item_id: catalogueNum },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(comments);
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const catalogueNum = decodeURIComponent(id);
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { comment } = body;
    if (!comment) {
      return NextResponse.json({ detail: "Comment text is required" }, { status: 400 });
    }

    const created = await prisma.itemComment.create({
      data: {
        item_id: catalogueNum,
        username: payload.username,
        comment,
      },
    });

    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
