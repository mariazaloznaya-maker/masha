import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "../../../../auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get("teacherId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};

  if (teacherId) where.teacherId = teacherId;
  if (from && to) {
    where.datetime = {
      gte: new Date(from),
      lte: new Date(to),
    };
  }

  const slots = await prisma.scheduleSlot.findMany({
    where,
    include: {
      teacher: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
    },
    orderBy: { datetime: "asc" },
  });

  return NextResponse.json(slots);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { teacherId, datetime, status, studentId, comment } = body;

  if (!teacherId || !datetime || !status) {
    return NextResponse.json({ error: "Обязательные поля: teacherId, datetime, status" }, { status: 400 });
  }

  // Если teacherId не передан явно, используем id текущего преподавателя
  const effectiveTeacherId =
    session.user.role === "teacher" ? session.user.id : teacherId;

  const slot = await prisma.scheduleSlot.create({
    data: {
      teacherId: effectiveTeacherId,
      datetime: new Date(datetime),
      status,
      studentId: studentId ?? null,
      comment: comment ?? null,
    },
    include: {
      teacher: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(slot, { status: 201 });
}
