import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "../../../../auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  const users = await prisma.user.findMany({
    where: {
      role: "student",
      name: { contains: search },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      social: true,
      class: true,
      goal: true,
      role: true,
      createdAt: true,
      subscriptions: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, phone, social, class: cls, goal, password } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Имя и email обязательны" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password ?? "student123", 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "student",
      phone,
      social,
      class: cls,
      goal,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
