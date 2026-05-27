import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Заполняем базу данных...");

  const adminHash = await bcrypt.hash("admin123", 10);
  const teacherHash = await bcrypt.hash("teacher123", 10);
  const studentHash = await bcrypt.hash("student123", 10);

  // Админ
  const admin = await prisma.user.upsert({
    where: { email: "admin@tms.ru" },
    update: {},
    create: {
      name: "Тихов Александр Владимирович",
      email: "admin@tms.ru",
      passwordHash: adminHash,
      role: "admin",
      phone: "+7 900 123-45-67",
    },
  });

  // Преподаватели
  const teacher1 = await prisma.user.upsert({
    where: { email: "teacher@tms.ru" },
    update: {},
    create: {
      name: "Иванова Марина Сергеевна",
      email: "teacher@tms.ru",
      passwordHash: teacherHash,
      role: "teacher",
      phone: "+7 911 222-33-44",
    },
  });

  const teacher2 = await prisma.user.upsert({
    where: { email: "teacher2@tms.ru" },
    update: {},
    create: {
      name: "Петров Дмитрий Николаевич",
      email: "teacher2@tms.ru",
      passwordHash: teacherHash,
      role: "teacher",
    },
  });

  // Ученики
  const student1 = await prisma.user.upsert({
    where: { email: "student@tms.ru" },
    update: {},
    create: {
      name: "Абрамова Анна Петровна",
      email: "student@tms.ru",
      passwordHash: studentHash,
      role: "student",
      phone: "+7 933 444-55-66",
      class: "11 класс",
      goal: "Поступление в 1-й Мед на лечебный факультет",
      social: "@anna_abramova",
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: "student2@tms.ru" },
    update: {},
    create: {
      name: "Борисов Кирилл Андреевич",
      email: "student2@tms.ru",
      passwordHash: studentHash,
      role: "student",
      class: "10 класс",
      goal: "Подготовка к ЕГЭ по биологии и химии",
    },
  });

  const student3 = await prisma.user.upsert({
    where: { email: "student3@tms.ru" },
    update: {},
    create: {
      name: "Волкова Екатерина Игоревна",
      email: "student3@tms.ru",
      passwordHash: studentHash,
      role: "student",
      class: "11 класс",
      goal: "Повторение анатомии",
      social: "@katya_v",
    },
  });

  // Абонементы
  await prisma.subscription.upsert({
    where: { id: "sub-1" },
    update: {},
    create: {
      id: "sub-1",
      studentId: student1.id,
      name: "Стандарт 8 занятий",
      lessonsCount: 8,
      pricePerLesson: 1500,
      discount: 0,
      totalPrice: 12000,
      isActive: true,
    },
  });

  await prisma.subscription.upsert({
    where: { id: "sub-2" },
    update: {},
    create: {
      id: "sub-2",
      studentId: student2.id,
      name: "Интенсив 12 занятий",
      lessonsCount: 12,
      pricePerLesson: 1500,
      discount: 10,
      totalPrice: 16200,
      isActive: true,
    },
  });

  // Слоты расписания — текущая неделя
  const now = new Date();
  const monday = new Date(now);
  const day = monday.getDay();
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1)); // начало недели (Пн)
  monday.setHours(0, 0, 0, 0);

  for (let d = 0; d < 5; d++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + d);

    // 9:00 — занято учеником
    const slot1 = new Date(date);
    slot1.setHours(9, 0, 0, 0);
    await prisma.scheduleSlot.upsert({
      where: { id: `slot-t1-9-${d}` },
      update: {},
      create: {
        id: `slot-t1-9-${d}`,
        teacherId: teacher1.id,
        datetime: slot1,
        status: d < 2 ? "booked" : "free",
        studentId: d < 2 ? student1.id : null,
      },
    });

    // 11:00 — пробное или свободное
    const slot2 = new Date(date);
    slot2.setHours(11, 0, 0, 0);
    await prisma.scheduleSlot.upsert({
      where: { id: `slot-t1-11-${d}` },
      update: {},
      create: {
        id: `slot-t1-11-${d}`,
        teacherId: teacher1.id,
        datetime: slot2,
        status: d === 2 ? "trial" : "free",
      },
    });

    // 14:00 — второй преподаватель
    const slot3 = new Date(date);
    slot3.setHours(14, 0, 0, 0);
    await prisma.scheduleSlot.upsert({
      where: { id: `slot-t2-14-${d}` },
      update: {},
      create: {
        id: `slot-t2-14-${d}`,
        teacherId: teacher2.id,
        datetime: slot3,
        status: d < 3 ? "booked" : "free",
        studentId: d < 3 ? student2.id : null,
      },
    });
  }

  // Занятия
  for (let i = 0; i < 4; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    date.setHours(9, 0, 0, 0);
    await prisma.lesson.upsert({
      where: { id: `lesson-${i}` },
      update: {},
      create: {
        id: `lesson-${i}`,
        studentId: student1.id,
        teacherId: teacher1.id,
        datetime: date,
        status: i < 2 ? "completed" : "scheduled",
        comment: i === 0 ? "Клетка и её строение" : null,
      },
    });
  }

  console.log("✅ База данных заполнена!\n");
  console.log("Тестовые аккаунты:");
  console.log("  Админ:         admin@tms.ru    / admin123");
  console.log("  Преподаватель: teacher@tms.ru  / teacher123");
  console.log("  Ученик:        student@tms.ru  / student123");

  void admin;
  void student3;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
