import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "../../../../../auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, studentId, comment } = body;

  const slot = await prisma.scheduleSlot.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(studentId !== undefined && { studentId: studentId || null }),
      ...(comment !== undefined && { comment }),
    },
    include: {
      teacher: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(slot);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  await prisma.scheduleSlot.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
