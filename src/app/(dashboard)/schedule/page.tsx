"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, Loader2, X, Check, UserSearch } from "lucide-react";
import {
  format, addDays, startOfWeek, isSameDay, addMonths, subMonths,
  startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek as swStart, endOfWeek
} from "date-fns";
import { ru } from "date-fns/locale";

interface Slot {
  id: string;
  datetime: string;
  status: string;
  comment?: string | null;
  teacher: { id: string; name: string };
  student?: { id: string; name: string } | null;
}

interface Teacher { id: string; name: string }
interface Student { id: string; name: string }

const STATUS_CSS: Record<string, string> = {
  free: "schedule-cell free",
  trial: "schedule-cell trial",
  busy: "schedule-cell busy",
  booked: "schedule-cell booked",
  empty: "schedule-cell empty",
};

const STATUS_LABELS: Record<string, string> = {
  free: "Свободно",
  trial: "Пробное",
  busy: "Занято (ученик)",
  booked: "Записан",
};

const hours = Array.from({ length: 31 }, (_, i) => ({
  h: 7 + Math.floor(i / 2),
  m: i % 2 === 0 ? 0 : 30,
  label: `${7 + Math.floor(i / 2)}:${i % 2 === 0 ? "00" : "30"}`,
}));

export default function SchedulePage() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";
  const userId = session?.user?.id ?? "";

  const [view, setView] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; slot: Slot } | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  // New booking modal
  const [bookModal, setBookModal] = useState<{ slot: Slot } | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [bookComment, setBookComment] = useState("");
  const [bookLoading, setBookLoading] = useState(false);

  // Загрузка преподавателей
  useEffect(() => {
    if (role === "admin") {
      fetch("/api/users?role=teacher").then(r => r.json()).then(setTeachers);
    }
  }, [role]);

  // Эффективный teacherId
  const effectiveTeacherId = role === "teacher" ? userId : selectedTeacherId;

  const fetchSlots = useCallback(async () => {
    if (!effectiveTeacherId && role !== "admin") return;
    setLoading(true);

    const from = view === "week" ? weekStart : startOfMonth(currentMonth);
    const to = view === "week" ? addDays(weekStart, 7) : endOfMonth(currentMonth);

    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });
    if (effectiveTeacherId) params.set("teacherId", effectiveTeacherId);

    const res = await fetch(`/api/schedule?${params}`);
    const data = await res.json();
    setSlots(data);
    setLoading(false);
  }, [effectiveTeacherId, view, weekStart, currentMonth, role]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  // Закрытие контекстного меню
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Клик на пустую ячейку — добавить свободное окно
  async function handleEmptyClick(day: Date, h: number, m: number) {
    if (!effectiveTeacherId) return;
    const datetime = new Date(day);
    datetime.setHours(h, m, 0, 0);

    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId: effectiveTeacherId,
        datetime: datetime.toISOString(),
        status: "free",
      }),
    });
    if (res.ok) fetchSlots();
  }

  // Клик на занятую ячейку — контекстное меню
  function handleSlotClick(e: React.MouseEvent, slot: Slot) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, slot });
  }

  // Контекстное меню: действие
  async function handleCtxAction(action: string) {
    if (!ctxMenu) return;
    const { slot } = ctxMenu;
    setCtxMenu(null);

    if (action === "delete") {
      await fetch(`/api/schedule/${slot.id}`, { method: "DELETE" });
      fetchSlots();
    } else if (action === "free") {
      await fetch(`/api/schedule/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "free", studentId: null }),
      });
      fetchSlots();
    } else if (action === "trial") {
      await fetch(`/api/schedule/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "trial" }),
      });
      fetchSlots();
    } else if (action === "book") {
      // Открыть модалку записи ученика
      fetch("/api/users?role=student").then(r => r.json()).then(setStudents);
      setBookModal({ slot });
      setStudentSearch("");
      setNewStudentName("");
      setSelectedStudentId("");
      setBookComment("");
    }
  }

  // Подтвердить запись ученика
  async function confirmBooking() {
    if (!bookModal) return;
    setBookLoading(true);

    let studentId = selectedStudentId;

    // Создать нового ученика
    if (!studentId && newStudentName.trim()) {
      const email = `${newStudentName.trim().toLowerCase().replace(/\s+/g, ".")}@tms.ru`;
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStudentName.trim(), email, password: "student123" }),
      });
      if (res.ok) {
        const created = await res.json();
        studentId = created.id;
      }
    }

    if (!studentId) { setBookLoading(false); return; }

    await fetch(`/api/schedule/${bookModal.slot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "booked", studentId, comment: bookComment || null }),
    });

    setBookLoading(false);
    setBookModal(null);
    fetchSlots();
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function getSlot(day: Date, h: number, m: number): Slot | undefined {
    return slots.find(s => {
      const d = new Date(s.datetime);
      return isSameDay(d, day) && d.getHours() === h && d.getMinutes() === m;
    });
  }

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Расписание</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {role === "admin" && (
            <select
              value={selectedTeacherId}
              onChange={e => setSelectedTeacherId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Все преподаватели</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button onClick={() => setView("week")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition cursor-pointer ${view === "week" ? "bg-white shadow text-slate-800" : "text-slate-500"}`}>Неделя</button>
            <button onClick={() => setView("month")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition cursor-pointer ${view === "month" ? "bg-white shadow text-slate-800" : "text-slate-500"}`}>Месяц</button>
          </div>
        </div>
      </div>

      {/* Навигация */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => view === "week" ? setWeekStart(d => addDays(d, -7)) : setCurrentMonth(d => subMonths(d, 1))}
          className="p-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"><ChevronLeft size={18} /></button>
        <span className="font-semibold text-slate-700 min-w-[200px] text-center">
          {view === "week"
            ? `${format(weekStart, "d MMM", { locale: ru })} – ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: ru })}`
            : format(currentMonth, "LLLL yyyy", { locale: ru })}
        </span>
        <button onClick={() => view === "week" ? setWeekStart(d => addDays(d, 7)) : setCurrentMonth(d => addMonths(d, 1))}
          className="p-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"><ChevronRight size={18} /></button>
        <button onClick={() => { setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })); setCurrentMonth(new Date()); }}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">Сегодня</button>
      </div>

      <p className="text-xs text-slate-400 mb-3">
        Клик на пустую ячейку — добавить свободное окно. Клик на ячейку — управление.
      </p>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
      ) : view === "week" ? (
        // ВЬЮХА: НЕДЕЛЯ
        <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
          <table className="text-sm border-collapse" style={{ minWidth: "700px", width: "100%" }}>
            <thead>
              <tr>
                <th className="w-14 px-2 py-2 bg-slate-50 border-b border-r border-slate-100 text-xs text-slate-400 font-normal"></th>
                {weekDays.map(d => (
                  <th key={d.toISOString()} className="px-1 py-2 bg-slate-50 border-b border-r border-slate-100 text-center font-medium text-slate-600">
                    <div className="text-xs">{format(d, "EEE", { locale: ru })}</div>
                    <div className="text-base font-bold text-slate-800">{format(d, "d")}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map(({ h, m, label }) => (
                <tr key={label}>
                  <td className="text-xs text-slate-400 border-r border-b border-slate-100 text-right pr-2 py-0 h-10 align-middle w-14">{label}</td>
                  {weekDays.map(day => {
                    const slot = getSlot(day, h, m);
                    return (
                      <td key={day.toISOString()} className="border-r border-b border-slate-100 p-0 h-10 relative"
                        onClick={() => !slot && handleEmptyClick(day, h, m)}>
                        {slot ? (
                          <div
                            onClick={e => handleSlotClick(e, slot)}
                            className={`absolute inset-0 flex flex-col justify-center px-1 ${STATUS_CSS[slot.status] ?? STATUS_CSS.empty} cursor-pointer`}
                          >
                            <span className="text-xs font-medium truncate leading-tight">
                              {STATUS_LABELS[slot.status]}
                            </span>
                            {slot.student && <span className="text-xs truncate opacity-75">{slot.student.name.split(" ")[0]}</span>}
                          </div>
                        ) : (
                          <div className="absolute inset-0 hover:bg-slate-100 cursor-pointer transition" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // ВЬЮХА: МЕСЯЦ
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {eachDayOfInterval({
              start: swStart(startOfMonth(currentMonth), { weekStartsOn: 1 }),
              end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
            }).map(day => {
              const daySlots = slots.filter(s => isSameDay(new Date(s.datetime), day));
              const inMonth = day.getMonth() === currentMonth.getMonth();
              return (
                <div key={day.toISOString()} className={`min-h-20 p-1 border-r border-b border-slate-100 ${!inMonth ? "bg-slate-50/70" : ""}`}>
                  <div className={`text-sm font-semibold mb-1 ${inMonth ? "text-slate-800" : "text-slate-300"}`}>{format(day, "d")}</div>
                  {daySlots.slice(0, 4).map(s => (
                    <div key={s.id} onClick={e => handleSlotClick(e as unknown as React.MouseEvent, s)}
                      className={`text-xs rounded px-1 py-0.5 mb-0.5 truncate cursor-pointer ${STATUS_CSS[s.status] ?? ""}`}>
                      {format(new Date(s.datetime), "H:mm")} {STATUS_LABELS[s.status]}
                    </div>
                  ))}
                  {daySlots.length > 4 && <div className="text-xs text-slate-400">+{daySlots.length - 4}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Легенда */}
      <div className="flex gap-4 mt-4 flex-wrap">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${STATUS_CSS[key].split(" ")[1] === "free" ? "bg-green-200" : STATUS_CSS[key].split(" ")[1] === "trial" ? "bg-yellow-200" : STATUS_CSS[key].split(" ")[1] === "busy" ? "bg-blue-200" : "bg-red-200"}`}
              style={{ background: key === "free" ? "#bbf7d0" : key === "trial" ? "#fef08a" : key === "busy" ? "#bfdbfe" : "#fecaca" }} />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>

      {/* КОНТЕКСТНОЕ МЕНЮ */}
      {ctxMenu && (
        <div ref={ctxRef} className="context-menu" style={{ top: ctxMenu.y, left: ctxMenu.x }}>
          <div className="px-3 py-2 border-b border-slate-100 text-xs text-slate-500 font-semibold">
            {format(new Date(ctxMenu.slot.datetime), "d MMM, H:mm", { locale: ru })}
          </div>
          {ctxMenu.slot.status !== "free" && (
            <button onClick={() => handleCtxAction("free")}>
              <span className="w-3 h-3 rounded-sm bg-green-200 inline-block" />Сделать свободным
            </button>
          )}
          {ctxMenu.slot.status !== "trial" && (
            <button onClick={() => handleCtxAction("trial")}>
              <span className="w-3 h-3 rounded-sm bg-yellow-200 inline-block" />Сделать пробным
            </button>
          )}
          <button onClick={() => handleCtxAction("book")}>
            <UserSearch size={12} />Записать ученика
          </button>
          <button onClick={() => handleCtxAction("delete")} className="text-red-500">
            <X size={12} />Удалить окно
          </button>
        </div>
      )}

      {/* МОДАЛКА ЗАПИСИ УЧЕНИКА */}
      {bookModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setBookModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-lg">Записать ученика</h3>
              <button onClick={() => setBookModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              {format(new Date(bookModal.slot.datetime), "d MMMM yyyy, H:mm", { locale: ru })}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Найти существующего ученика</label>
              <div className="relative mb-2">
                <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Поиск по имени..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {studentSearch && (
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                  {filteredStudents.length === 0 ? (
                    <p className="text-sm text-slate-400 p-3">Не найдено</p>
                  ) : filteredStudents.map(s => (
                    <button key={s.id} onClick={() => { setSelectedStudentId(s.id); setStudentSearch(s.name); setNewStudentName(""); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition cursor-pointer ${selectedStudentId === s.id ? "bg-blue-50 text-blue-700" : ""}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">или введите имя нового ученика</label>
              <input type="text" value={newStudentName} onChange={e => { setNewStudentName(e.target.value); setSelectedStudentId(""); }}
                placeholder="Имя Фамилия"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">Комментарий (необязательно)</label>
              <input type="text" value={bookComment} onChange={e => setBookComment(e.target.value)}
                placeholder="Тема занятия, заметки..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="flex gap-2">
              <button onClick={confirmBooking} disabled={bookLoading || (!selectedStudentId && !newStudentName.trim())}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2.5 rounded-lg font-medium transition cursor-pointer">
                {bookLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Записать
              </button>
              <button onClick={() => setBookModal(null)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition cursor-pointer">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
