import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { promises as fs } from "fs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    if (!doc || !doc.file_path) {
      return NextResponse.json({ detail: "Document file not found" }, { status: 404 });
    }

    const buffer = await fs.readFile(doc.file_path);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": doc.content_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.original_filename || "document")}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
