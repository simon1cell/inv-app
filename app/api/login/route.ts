import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    let username = "";
    let password = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      username = formData.get("username")?.toString() || "";
      password = formData.get("password")?.toString() || "";
    } else {
      const body = await req.json().catch(() => ({}));
      username = body.username || "";
      password = body.password || "";
    }

    if (!username || !password) {
      return NextResponse.json({ detail: "Username and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !(await comparePassword(password, user.hashed_password))) {
      return NextResponse.json({ detail: "Incorrect username or password" }, { status: 400 });
    }

    const token = await createToken({ username: user.username, role: user.role });

    return NextResponse.json({
      access_token: token,
      token_type: "bearer",
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
