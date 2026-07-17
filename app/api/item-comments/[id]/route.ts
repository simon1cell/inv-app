import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    const commentId = parseInt(id);
    if (isNaN(commentId)) {
      return NextResponse.json({ detail: "Invalid comment ID" }, { status: 400 });
    }

    const comment = await prisma.itemComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ detail: "Comment not found" }, { status: 404 });
    }

    if (comment.username !== payload.username && payload.role !== "admin") {
      return NextResponse.json({ detail: "Not authorized to delete this comment" }, { status: 403 });
    }

    await prisma.itemComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ message: "Comment deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
