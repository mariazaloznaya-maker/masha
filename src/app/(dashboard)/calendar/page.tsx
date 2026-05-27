"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday, addMonths, subMonths,
  addDays, eachHourOfInterval, setHours, setMinutes, isSameDay
} from "date-fns";
import { ru } from "date-fns/locale";

interface Slot {
  id: string;
  datetime: string;
  status: string;
  teacher: { name: string };
  student?: { name: string } | null;
  comment?: string;
}

const STATUS_COLORS: Record<string, string> = {
  free: "bg-green-200 text-green-800",
  trial: "bg-yellow-200 text-yellow-800",
  busy: "bg-blue-200 text-blue-800",
  booked: "bg-red-200 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  free: "Свободно",
  trial: "Пробное",
  busy: "Занято",
  booked: "Записан",
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"month" | "week">("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    let from: string, to: string;

    if (view === "month") {
      from = startOfMonth(currentDate).toISOString();
      to = endOfMonth(currentDate).toISOString();
    } else {
      from = weekStart.toISOString();
      to = addDays(weekStart, 6).toISOString();
    }

    const res = await fetch(`/api/schedule?from=${from}&to=${to}`);
    const data = await res.json();
    setSlots(data);
    setLoading(false);
  }, [currentDate, view, weekStart]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Week view
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 31 }, (_, i) => {
    const h = 7 + Math.floor(i / 2);
    const m = i % 2 === 0 ? 0 : 30;
    return { h, m, label: `${h}:${m === 0 ? "00" : "30"}` };
  });

  function getSlotsForCell(day: Date, h: number, m: number) {
    return slots.filter(s => {
      const d = new Date(s.datetime);
      return isSameDay(d, day) && d.getHours() === h && d.getMinutes() === m;
    });
  }

  // Month view
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Календарь занятий</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button onClick={() => setView("week")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition cursor-pointer ${view === "week" ? "bg-white shadow text-slate-800" : "text-slate-500"}`}>Неделя</button>
            <button onClick={() => setView("month")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition cursor-pointer ${view === "month" ? "bg-white shadow text-slate-800" : "text-slate-500"}`}>Месяц</button>
          </div>
        </div>
      </div>

      {/* Навигация */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => {
            if (view === "month") setCurrentDate(d => subMonths(d, 1));
            else setWeekStart(d => addDays(d, -7));
          }}
          className="p-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
        >
          <ChevronLeft size={18} />
        </button>

        <h3 className="text-lg font-semibold text-slate-700 min-w-[200px] text-center">
          {view === "month"
            ? format(currentDate, "LLLL yyyy", { locale: ru })
            : `${format(weekStart, "d MMM", { locale: ru })} – ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: ru })}`
          }
        </h3>

        <button
          onClick={() => {
            if (view === "month") setCurrentDate(d => addMonths(d, 1));
            else setWeekStart(d => addDays(d, 7));
          }}
          className="p-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
        >
          <ChevronRight size={18} />
        </button>

        <button
          onClick={() => {
            setCurrentDate(new Date());
            setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
          }}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
        >
          Сегодня
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : view === "week" ? (
        // НЕДЕЛЯ
        <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="w-16 px-2 py-2 text-xs text-slate-400 font-normal border-b border-r border-slate-100 bg-slate-50"></th>
                {weekDays.map(day => (
                  <th key={day.toISOString()} className={`px-2 py-2 border-b border-r border-slate-100 font-medium text-center ${isToday(day) ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-600"}`}>
                    <div className="text-xs">{format(day, "EEE", { locale: ru })}</div>
                    <div className={`text-lg font-bold ${isToday(day) ? "text-blue-600" : "text-slate-800"}`}>{format(day, "d")}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map(({ h, m, label }) => (
                <tr key={label} className="hover:bg-slate-50/50">
                  <td className="px-2 py-0 text-xs text-slate-400 border-r border-b border-slate-100 text-right pr-2 w-16 h-10 align-top pt-1">{label}</td>
                  {weekDays.map(day => {
                    const cellSlots = getSlotsForCell(day, h, m);
                    return (
                      <td key={day.toISOString()} className="border-r border-b border-slate-100 p-0.5 h-10 align-top">
                        {cellSlots.map(s => (
                          <div key={s.id} title={`${s.teacher.name}${s.student ? ` → ${s.student.name}` : ""}${s.comment ? ` · ${s.comment}` : ""}`}
                            className={`text-xs rounded px-1.5 py-0.5 mb-0.5 truncate ${STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                            <span className="font-medium">{s.teacher.name.split(" ")[0]}</span>
                            {s.student && <span> · {s.student.name.split(" ")[0]}</span>}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // МЕСЯЦ
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {allDays.map(day => {
              const daySlots = slots.filter(s => isSameDay(new Date(s.datetime), day));
              const inMonth = isSameMonth(day, currentDate);
              return (
                <div key={day.toISOString()} className={`min-h-24 p-1.5 border-r border-b border-slate-100 ${!inMonth ? "bg-slate-50/80" : ""} ${isToday(day) ? "bg-blue-50" : ""}`}>
                  <div className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday(day) ? "bg-blue-600 text-white" : inMonth ? "text-slate-800" : "text-slate-300"}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {daySlots.slice(0, 3).map(s => (
                      <div key={s.id} className={`text-xs rounded px-1 py-0.5 truncate ${STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {format(new Date(s.datetime), "H:mm")} {s.teacher.name.split(" ")[0]}
                      </div>
                    ))}
                    {daySlots.length > 3 && (
                      <div className="text-xs text-slate-400">+{daySlots.length - 3} ещё</div>
                    )}
                  </div>
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
            <div className={`w-3 h-3 rounded-sm ${STATUS_COLORS[key]}`} />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
