import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { createOrderEvent } from "@/lib/crud";
import { promises as fs } from "fs";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "order_documents");

// Helper to ensure upload dir exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_ROOT, { recursive: true });
  } catch (error) {}
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    if (payload.role !== "admin") {
      return NextResponse.json({ detail: "Not authorized" }, { status: 403 });
    }

    if (isNaN(orderId)) {
      return NextResponse.json({ detail: "Invalid order ID" }, { status: 400 });
    }

    const docs = await prisma.orderDocument.findMany({
      where: { order_id: orderId },
      orderBy: { received_at: "desc" },
    });

    return NextResponse.json(docs);
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    const payload = await getAuthenticatedUser(req);
    if (!payload) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    if (payload.role !== "admin") {
      return NextResponse.json({ detail: "Not authorized" }, { status: 403 });
    }

    if (isNaN(orderId)) {
      return NextResponse.json({ detail: "Invalid order ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const documentType = searchParams.get("document_type") || "other";

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ detail: "No file provided" }, { status: 400 });
    }

    const originalFilename = file.name || "document";
    const contentType = file.type || "application/octet-stream";

    // Generate unique stored filename
    const uniqueId = Math.random().toString(36).substring(2, 15) + "_" + Date.now();
    const ext = path.extname(originalFilename);
    const storedFilename = `${uniqueId}${ext}`;
    const filePath = path.join(UPLOAD_ROOT, storedFilename);

    // Write file to uploads directory
    await ensureUploadDir();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    const doc = await prisma.orderDocument.create({
      data: {
        order_id: orderId,
        document_type: documentType,
        source: "manual",
        original_filename: originalFilename,
        stored_filename: storedFilename,
        file_path: filePath,
        content_type: contentType,
        reviewed: true,
      },
    });

    let eventNotes = `Uploaded ${documentType} document: ${originalFilename}`;
    await createOrderEvent(orderId, "DOCUMENT_UPLOADED", eventNotes, payload.username);

    // Update order status based on document type
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order) {
      let nextStatus = order.status;
      if (documentType === "confirmation" && order.status === "Ordered") {
        nextStatus = "Confirmed";
        await createOrderEvent(orderId, "CONFIRMED", "Order confirmation uploaded", payload.username);
      } else if (documentType === "invoice" && (order.status === "Delivered" || order.status === "Confirmed" || order.status === "Ordered")) {
        nextStatus = "Invoice Received";
        await createOrderEvent(orderId, "INVOICE_RECEIVED", "Invoice uploaded", payload.username);
      }

      if (nextStatus !== order.status) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: nextStatus },
        });
      }
    }

    return NextResponse.json(doc);
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
