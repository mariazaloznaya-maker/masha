"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Search, Plus, X, UserCircle, Phone, Link2,
  BookOpen, CreditCard, ChevronRight, Loader2,
  Calendar, Pencil, Trash2, Check
} from "lucide-react";
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
}

interface Lesson {
  id: string;
  datetime: string;
  status: string;
  comment: string | null;
  teacher: { name: string };
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  social?: string;
  class?: string;
  goal?: string;
  subscriptions?: Subscription[];
  lessons?: Lesson[];
}

type ModalMode = "view" | "edit" | "new" | "subscription" | "lessons";

export default function ClientsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", social: "", class: "", goal: ""
  });

  // Subscription form
  const [subForm, setSubForm] = useState({
    name: "", lessonsCount: "8", pricePerLesson: "", discount: "0"
  });
  const [subSaving, setSubSaving] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/clients?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setClients(data);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  async function openClient(client: Client) {
    const res = await fetch(`/api/clients/${client.id}`);
    const data = await res.json();
    setSelectedClient(data);
    setModalMode("view");
  }

  function openNewClient() {
    setFormData({ name: "", email: "", phone: "", social: "", class: "", goal: "" });
    setModalMode("new");
    setSelectedClient(null);
  }

  function openEditClient(client: Client) {
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone ?? "",
      social: client.social ?? "",
      class: client.class ?? "",
      goal: client.goal ?? "",
    });
    setModalMode("edit");
  }

  async function saveClient() {
    if (modalMode === "new") {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, password: "student123" }),
      });
      if (res.ok) {
        setModalMode(null);
        fetchClients();
      }
    } else if (modalMode === "edit" && selectedClient) {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedClient({ ...selectedClient, ...updated });
        setModalMode("view");
        fetchClients();
      }
    }
  }

  async function deleteClient(id: string) {
    if (!confirm("Удалить ученика? Это действие необратимо.")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    setModalMode(null);
    setSelectedClient(null);
    fetchClients();
  }

  async function saveSubscription() {
    if (!selectedClient) return;
    setSubSaving(true);
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: selectedClient.id,
        name: subForm.name,
        lessonsCount: Number(subForm.lessonsCount),
        pricePerLesson: Number(subForm.pricePerLesson),
        discount: Number(subForm.discount),
      }),
    });
    setSubSaving(false);
    if (res.ok) {
      const updated = await fetch(`/api/clients/${selectedClient.id}`).then(r => r.json());
      setSelectedClient(updated);
      setModalMode("view");
    }
  }

  const totalPrice = Number(subForm.lessonsCount) * Number(subForm.pricePerLesson) * (1 - Number(subForm.discount) / 100);

  // Grouped by letter
  const grouped = clients.reduce<Record<string, Client[]>>((acc, c) => {
    const letter = c.name[0]?.toUpperCase() ?? "#";
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(c);
    return acc;
  }, {});

  const letters = Object.keys(grouped).sort();

  return (
    <div>
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Клиенты</h2>
          <p className="text-slate-500 text-sm mt-1">Всего учеников: {clients.length}</p>
        </div>
        {isAdmin && (
          <button
            onClick={openNewClient}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition cursor-pointer"
          >
            <Plus size={18} />
            Добавить ученика
          </button>
        )}
      </div>

      {/* Поиск */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Список */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <UserCircle size={48} className="mx-auto mb-3 opacity-30" />
          <p>Ученики не найдены</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {letters.map((letter, li) => (
            <div key={letter}>
              <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                {letter}
              </div>
              {grouped[letter].map((client, ci) => {
                const activeSub = client.subscriptions?.[0];
                const isLast = li === letters.length - 1 && ci === grouped[letter].length - 1;
                return (
                  <button
                    key={client.id}
                    onClick={() => openClient(client)}
                    className={`w-full flex items-center justify-between px-5 py-3.5 hover:bg-blue-50 transition text-left cursor-pointer ${!isLast ? "border-b border-slate-100" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{client.name}</div>
                        <div className="text-xs text-slate-400">{client.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {activeSub && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          {activeSub.name}
                        </span>
                      )}
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setModalMode(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Просмотр карточки */}
            {modalMode === "view" && selectedClient && (
              <>
                <div className="flex items-center justify-between p-5 border-b">
                  <h3 className="text-lg font-bold text-slate-800">Карточка ученика</h3>
                  <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold">
                      {selectedClient.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-800">{selectedClient.name}</h4>
                      <p className="text-slate-500 text-sm">{selectedClient.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedClient.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone size={14} className="text-slate-400" />
                        {selectedClient.phone}
                      </div>
                    )}
                    {selectedClient.social && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Link2 size={14} className="text-slate-400" />
                        {selectedClient.social}
                      </div>
                    )}
                    {selectedClient.class && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <BookOpen size={14} className="text-slate-400" />
                        Класс: {selectedClient.class}
                      </div>
                    )}
                  </div>

                  {selectedClient.goal && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Цель обучения</p>
                      <p className="text-sm text-slate-700">{selectedClient.goal}</p>
                    </div>
                  )}

                  {/* Активный абонемент */}
                  {isAdmin && selectedClient.subscriptions && selectedClient.subscriptions.length > 0 && (
                    <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-green-700 mb-2">Активный абонемент</p>
                      {selectedClient.subscriptions.filter(s => s.isActive).slice(0, 1).map(s => (
                        <div key={s.id} className="text-sm text-slate-700 space-y-1">
                          <p className="font-medium">{s.name}</p>
                          <p>{s.lessonsCount} занятий × {s.pricePerLesson} ₽
                            {s.discount > 0 && <span className="text-green-600"> − {s.discount}%</span>}
                          </p>
                          <p className="font-bold text-green-700">{s.totalPrice} ₽ итого</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 px-5 pb-5 pt-2 flex-wrap">
                  <button
                    onClick={() => setModalMode("lessons")}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition cursor-pointer"
                  >
                    <Calendar size={16} />
                    Занятия
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => setModalMode("subscription")}
                        className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition cursor-pointer"
                      >
                        <CreditCard size={16} />
                        Абонемент
                      </button>
                      <button
                        onClick={() => openEditClient(selectedClient)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Pencil size={16} />
                        Редактировать
                      </button>
                      <button
                        onClick={() => deleteClient(selectedClient.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition cursor-pointer ml-auto"
                      >
                        <Trash2 size={16} />
                        Удалить
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Форма создания/редактирования */}
            {(modalMode === "new" || modalMode === "edit") && (
              <>
                <div className="flex items-center justify-between p-5 border-b">
                  <h3 className="text-lg font-bold text-slate-800">
                    {modalMode === "new" ? "Новый ученик" : "Редактировать ученика"}
                  </h3>
                  <button onClick={() => setModalMode(selectedClient ? "view" : null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
                </div>
                <div className="p-5 space-y-4">
                  {[
                    { key: "name", label: "ФИО*", type: "text", placeholder: "Иванов Иван Иванович" },
                    { key: "email", label: "Email*", type: "email", placeholder: "ivan@example.com" },
                    { key: "phone", label: "Телефон", type: "text", placeholder: "+7 900 000-00-00" },
                    { key: "social", label: "Соцсеть / мессенджер", type: "text", placeholder: "@username или ссылка" },
                    { key: "class", label: "Класс / курс", type: "text", placeholder: "10 класс" },
                    { key: "goal", label: "Цель обучения", type: "text", placeholder: "Подготовка к ЕГЭ" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                      <input
                        type={f.type}
                        value={formData[f.key as keyof typeof formData]}
                        onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                  {modalMode === "new" && (
                    <p className="text-xs text-slate-400">Пароль по умолчанию: student123</p>
                  )}
                </div>
                <div className="flex gap-2 px-5 pb-5">
                  <button onClick={saveClient} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition cursor-pointer">
                    <Check size={16} /> Сохранить
                  </button>
                  <button onClick={() => setModalMode(selectedClient ? "view" : null)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                    Отмена
                  </button>
                </div>
              </>
            )}

            {/* Форма абонемента */}
            {modalMode === "subscription" && selectedClient && (
              <>
                <div className="flex items-center justify-between p-5 border-b">
                  <h3 className="text-lg font-bold text-slate-800">Добавить абонемент</h3>
                  <button onClick={() => setModalMode("view")} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Название абонемента</label>
                    <input type="text" value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })}
                      placeholder="Базовый, 8 занятий" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Кол-во занятий</label>
                      <input type="number" value={subForm.lessonsCount} onChange={e => setSubForm({ ...subForm, lessonsCount: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Цена за занятие, ₽</label>
                      <input type="number" value={subForm.pricePerLesson} onChange={e => setSubForm({ ...subForm, pricePerLesson: e.target.value })}
                        placeholder="1500" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Скидка</label>
                    <div className="flex gap-2">
                      {["0", "10", "20"].map(d => (
                        <button key={d} onClick={() => setSubForm({ ...subForm, discount: d })}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition cursor-pointer ${subForm.discount === d ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:border-blue-300"}`}>
                          {d === "0" ? "Без скидки" : `${d}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                  {subForm.lessonsCount && subForm.pricePerLesson && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-slate-600 space-y-1">
                        <div className="flex justify-between">
                          <span>{subForm.lessonsCount} занятий × {subForm.pricePerLesson} ₽</span>
                          <span>{Number(subForm.lessonsCount) * Number(subForm.pricePerLesson)} ₽</span>
                        </div>
                        {Number(subForm.discount) > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Скидка {subForm.discount}%</span>
                            <span>− {Math.round(Number(subForm.lessonsCount) * Number(subForm.pricePerLesson) * Number(subForm.discount) / 100)} ₽</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-blue-700 text-base pt-1 border-t border-blue-200">
                          <span>Итого к оплате</span>
                          <span>{Math.round(totalPrice)} ₽</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 px-5 pb-5">
                  <button onClick={saveSubscription} disabled={subSaving} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium transition cursor-pointer disabled:opacity-50">
                    {subSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Сохранить
                  </button>
                  <button onClick={() => setModalMode("view")} className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition cursor-pointer">Отмена</button>
                </div>
              </>
            )}

            {/* Занятия ученика */}
            {modalMode === "lessons" && selectedClient && (
              <>
                <div className="flex items-center justify-between p-5 border-b">
                  <h3 className="text-lg font-bold text-slate-800">Занятия: {selectedClient.name}</h3>
                  <button onClick={() => setModalMode("view")} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
                </div>
                <div className="p-5">
                  {!selectedClient.lessons || selectedClient.lessons.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">Занятий пока нет</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedClient.lessons.map(lesson => (
                        <div key={lesson.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <div className="font-medium text-slate-800 text-sm">
                              {format(new Date(lesson.datetime), "d MMMM yyyy, HH:mm", { locale: ru })}
                            </div>
                            <div className="text-xs text-slate-500">{lesson.teacher.name}</div>
                            {lesson.comment && <div className="text-xs text-slate-400 italic mt-1">{lesson.comment}</div>}
                          </div>
                          <StatusBadge status={lesson.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-5 pb-5">
                  <button onClick={() => setModalMode("view")} className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                    Назад
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    scheduled: { label: "Запланировано", className: "bg-blue-100 text-blue-700" },
    completed: { label: "Проведено", className: "bg-green-100 text-green-700" },
    cancelled: { label: "Отменено", className: "bg-red-100 text-red-700" },
    trial: { label: "Пробное", className: "bg-yellow-100 text-yellow-700" },
  };
  const s = map[status] ?? { label: status, className: "bg-slate-100 text-slate-600" };
  return <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.className}`}>{s.label}</span>;
}
