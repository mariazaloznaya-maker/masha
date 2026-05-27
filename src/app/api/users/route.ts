import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "../../../../auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const search = searchParams.get("search") ?? "";

  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(search ? { name: { contains: search } } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
