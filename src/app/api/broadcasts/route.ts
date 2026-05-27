import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "../../../../auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const broadcasts = await prisma.broadcast.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(broadcasts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, content, target } = body;

  const broadcast = await prisma.broadcast.create({
    data: { title, content, target: target ?? "all" },
  });

  return NextResponse.json(broadcast, { status: 201 });
}
