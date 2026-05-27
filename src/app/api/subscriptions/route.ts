import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "../../../../auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");

  const subs = await prisma.subscription.findMany({
    where: studentId ? { studentId } : undefined,
    include: {
      student: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(subs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { studentId, name, lessonsCount, pricePerLesson, discount } = body;

  if (!studentId || !name || !lessonsCount || !pricePerLesson) {
    return NextResponse.json({ error: "Заполните все обязательные поля" }, { status: 400 });
  }

  const disc = discount ?? 0;
  const totalPrice = lessonsCount * pricePerLesson * (1 - disc / 100);

  const sub = await prisma.subscription.create({
    data: {
      studentId,
      name,
      lessonsCount: Number(lessonsCount),
      pricePerLesson: Number(pricePerLesson),
      discount: Number(disc),
      totalPrice: Math.round(totalPrice),
    },
    include: {
      student: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(sub, { status: 201 });
}
