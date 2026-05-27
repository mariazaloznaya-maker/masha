import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "../../../../auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get("teacherId");
  const studentId = searchParams.get("studentId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (teacherId) where.teacherId = teacherId;
  if (studentId) where.studentId = studentId;
  if (from && to) {
    where.datetime = { gte: new Date(from), lte: new Date(to) };
  }

  const lessons = await prisma.lesson.findMany({
    where,
    include: {
      teacher: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
    },
    orderBy: { datetime: "asc" },
  });

  return NextResponse.json(lessons);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { studentId, teacherId, datetime, status, comment } = body;

  if (!studentId || !teacherId || !datetime) {
    return NextResponse.json({ error: "Обязательные поля: studentId, teacherId, datetime" }, { status: 400 });
  }

  const lesson = await prisma.lesson.create({
    data: {
      studentId,
      teacherId,
      datetime: new Date(datetime),
      status: status ?? "scheduled",
      comment,
    },
    include: {
      teacher: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(lesson, { status: 201 });
}
