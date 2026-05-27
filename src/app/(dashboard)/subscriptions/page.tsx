"use client";

import { useEffect, useState } from "react";
import { Plus, X, Check, Loader2, CreditCard, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface Subscription {
  id: string;
  name: string;
  lessonsCount: number;
  pricePerLesson: number;
  discount: number;
  totalPrice: number;
  isActive: boolean;
  createdAt: string;
  student: { id: string; name: string };
}

interface Student { id: string; name: string }

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    studentId: "",
    name: "",
    lessonsCount: "8",
    pricePerLesson: "1500",
    discount: "0",
  });

  async function fetchSubs() {
    setLoading(true);
    const res = await fetch("/api/subscriptions");
    setSubs(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchSubs(); }, []);

  async function openModal() {
    const res = await fetch("/api/users?role=student");
    setStudents(await res.json());
    setForm({ studentId: "", name: "", lessonsCount: "8", pricePerLesson: "1500", discount: "0" });
    setShowModal(true);
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: form.studentId,
        name: form.name,
        lessonsCount: Number(form.lessonsCount),
        pricePerLesson: Number(form.pricePerLesson),
        discount: Number(form.discount),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowModal(false);
      fetchSubs();
    }
  }

  async function deleteSub(id: string) {
    if (!confirm("Удалить абонемент?")) return;
    await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    fetchSubs();
  }

  async function toggleActive(sub: Subscription) {
    await fetch(`/api/subscriptions/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !sub.isActive }),
    });
    fetchSubs();
  }

  const total = Number(form.lessonsCount) * Number(form.pricePerLesson) * (1 - Number(form.discount) / 100);

  // Группировка по ученикам
  const byStudent = subs.reduce<Record<string, Subscription[]>>((acc, s) => {
    const key = s.student.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Абонементы</h2>
          <p className="text-slate-500 text-sm mt-1">Всего: {subs.length}</p>
        </div>
        <button onClick={openModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition cursor-pointer">
          <Plus size={18} />Новый абонемент
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
      ) : subs.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <CreditCard size={48} className="mx-auto mb-3 opacity-30" />
          <p>Абонементов пока нет</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byStudent).map(([, studentSubs]) => {
            const student = studentSubs[0].student;
            return (
              <div key={student.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                    {student.name.charAt(0)}
                  </div>
                  <span className="font-semibold text-slate-800">{student.name}</span>
                  <span className="text-xs text-slate-500">{studentSubs.filter(s => s.isActive).length} активных</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {studentSubs.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-800">{sub.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sub.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                            {sub.isActive ? "Активен" : "Архив"}
                          </span>
                        </div>
                        <div className="text-sm text-slate-500 flex items-center gap-3">
                          <span>{sub.lessonsCount} занятий</span>
                          <span>×</span>
                          <span>{sub.pricePerLesson} ₽</span>
                          {sub.discount > 0 && <span className="text-green-600">−{sub.discount}%</span>}
                          <span className="font-semibold text-slate-700">=</span>
                          <span className="font-bold text-blue-700">{sub.totalPrice} ₽</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Добавлен {format(new Date(sub.createdAt), "d MMM yyyy", { locale: ru })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleActive(sub)}
                          className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer">
                          {sub.isActive ? "В архив" : "Активировать"}
                        </button>
                        <button onClick={() => deleteSub(sub.id)} className="p-2 text-slate-400 hover:text-red-500 transition cursor-pointer">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold text-slate-800">Новый абонемент</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ученик</label>
                <select value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Выберите ученика</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Название</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Базовый, 8 занятий" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Кол-во занятий</label>
                  <div className="flex gap-1">
                    {["4", "8", "12", "16"].map(n => (
                      <button key={n} onClick={() => setForm({ ...form, lessonsCount: n })}
                        className={`flex-1 py-2 text-sm rounded-lg border transition cursor-pointer ${form.lessonsCount === n ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 hover:border-blue-300"}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Цена / занятие, ₽</label>
                  <input type="number" value={form.pricePerLesson} onChange={e => setForm({ ...form, pricePerLesson: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Скидка</label>
                <div className="flex gap-2">
                  {["0", "10", "20"].map(d => (
                    <button key={d} onClick={() => setForm({ ...form, discount: d })}
                      className={`flex-1 py-2 text-sm rounded-lg border transition cursor-pointer ${form.discount === d ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 hover:border-blue-300"}`}>
                      {d === "0" ? "Нет" : `${d}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Расчёт */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wide">Итого к оплате</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>{form.lessonsCount} × {form.pricePerLesson} ₽</span>
                    <span>{Number(form.lessonsCount) * Number(form.pricePerLesson)} ₽</span>
                  </div>
                  {Number(form.discount) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Скидка {form.discount}%</span>
                      <span>−{Math.round(Number(form.lessonsCount) * Number(form.pricePerLesson) * Number(form.discount) / 100)} ₽</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-blue-700 text-lg pt-1 border-t border-blue-200">
                    <span>Сумма</span>
                    <span>{Math.round(total)} ₽</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={save} disabled={saving || !form.studentId || !form.name}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2.5 rounded-lg font-medium transition cursor-pointer">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Сохранить
              </button>
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition cursor-pointer">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
