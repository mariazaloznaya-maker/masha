"use client";

import { useEffect, useState } from "react";
import { Users, GraduationCap, Calendar, CreditCard, Building2, Loader2 } from "lucide-react";

interface Stats {
  studentsCount: number;
  teachersCount: number;
  totalLessons: number;
  activeSubscriptions: number;
}

export default function CompanyPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [studentsRes, teachersRes, lessonsRes, subsRes] = await Promise.all([
        fetch("/api/users?role=student"),
        fetch("/api/users?role=teacher"),
        fetch("/api/lessons"),
        fetch("/api/subscriptions"),
      ]);
      const [students, teachers, lessons, subs] = await Promise.all([
        studentsRes.json(), teachersRes.json(), lessonsRes.json(), subsRes.json(),
      ]);
      setStats({
        studentsCount: students.length,
        teachersCount: teachers.length,
        totalLessons: lessons.length,
        activeSubscriptions: subs.filter((s: { isActive: boolean }) => s.isActive).length,
      });
      setLoading(false);
    }
    fetchStats();
  }, []);

  const statCards = stats ? [
    { label: "Учеников", value: stats.studentsCount, icon: GraduationCap, color: "bg-blue-50 text-blue-600" },
    { label: "Преподавателей", value: stats.teachersCount, icon: Users, color: "bg-purple-50 text-purple-600" },
    { label: "Занятий проведено", value: stats.totalLessons, icon: Calendar, color: "bg-green-50 text-green-600" },
    { label: "Активных абонементов", value: stats.activeSubscriptions, icon: CreditCard, color: "bg-orange-50 text-orange-600" },
  ] : [];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Компания</h2>
        <p className="text-slate-500 text-sm mt-1">Общая информация и статистика</p>
      </div>

      {/* Карточка компании */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
            <Building2 size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-bold">Tikhov Med School</h3>
            <p className="text-slate-300 mt-1">Онлайн-школа медицинских знаний</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Email</span>
            <p className="font-medium">info@tikhov-med.ru</p>
          </div>
          <div>
            <span className="text-slate-400">Телефон</span>
            <p className="font-medium">+7 (800) 555-00-00</p>
          </div>
          <div>
            <span className="text-slate-400">Формат</span>
            <p className="font-medium">Онлайн, Zoom / Google Meet</p>
          </div>
          <div>
            <span className="text-slate-400">Предметы</span>
            <p className="font-medium">Биология, Химия, Анатомия</p>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <h3 className="font-semibold text-slate-700 mb-4">Статистика</h3>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 text-center">
                <div className={`w-12 h-12 rounded-full ${card.color} flex items-center justify-center mx-auto mb-3`}>
                  <Icon size={24} />
                </div>
                <div className="text-3xl font-bold text-slate-800">{card.value}</div>
                <div className="text-sm text-slate-500 mt-1">{card.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* О школе */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">О школе</h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          Tikhov Med School — современная онлайн-школа, специализирующаяся на подготовке абитуриентов к поступлению в медицинские университеты.
          Наши преподаватели — практикующие врачи и преподаватели ведущих медицинских вузов России.
          Мы помогаем ученикам освоить биологию, химию и другие дисциплины, необходимые для успешной сдачи ЕГЭ и профильных вступительных испытаний.
        </p>
      </div>
    </div>
  );
}
