import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { promises as fs } from "fs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const documentId = parseInt(id);
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    if (payload.role !== "admin") {
      return NextResponse.json({ detail: "Not authorized" }, { status: 403 });
    }

    if (isNaN(documentId)) {
      return NextResponse.json({ detail: "Invalid document ID" }, { status: 400 });
    }

    const doc = await prisma.orderDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      return NextResponse.json({ detail: "Document not found" }, { status: 404 });
    }

    // Attempt to delete physical file from disk
    if (doc.file_path) {
      try {
        await fs.unlink(doc.file_path);
      } catch (err) {}
    }

    await prisma.orderDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ message: "Document deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
