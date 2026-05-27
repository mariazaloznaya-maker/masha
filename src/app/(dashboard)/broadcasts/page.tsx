"use client";

import { useEffect, useState } from "react";
import { Plus, Send, X, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface Broadcast {
  id: string;
  title: string;
  content: string;
  target: string;
  sentAt: string | null;
  createdAt: string;
}

const TARGET_LABELS: Record<string, string> = {
  all: "Всем",
  students: "Ученикам",
  teachers: "Преподавателям",
};

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", target: "all" });

  async function fetchBroadcasts() {
    setLoading(true);
    const res = await fetch("/api/broadcasts");
    if (res.ok) setBroadcasts(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchBroadcasts(); }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowModal(false);
    setForm({ title: "", content: "", target: "all" });
    fetchBroadcasts();
  }

  async function markSent(id: string) {
    await fetch(`/api/broadcasts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentAt: new Date().toISOString() }),
    });
    fetchBroadcasts();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Рассылки</h2>
          <p className="text-slate-500 text-sm mt-1">Управление уведомлениями и сообщениями</p>
        </div>
        <button onClick={() => { setForm({ title: "", content: "", target: "all" }); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition cursor-pointer">
          <Plus size={18} />Создать рассылку
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
      ) : broadcasts.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Send size={48} className="mx-auto mb-3 opacity-30" />
          <p>Рассылок пока нет</p>
        </div>
      ) : (
        <div className="space-y-4">
          {broadcasts.map(b => (
            <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-800">{b.title}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{TARGET_LABELS[b.target] ?? b.target}</span>
                    {b.sentAt ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={10} />Отправлено
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Черновик</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{b.content}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Создано {format(new Date(b.createdAt), "d MMM yyyy", { locale: ru })}
                    {b.sentAt && ` · Отправлено ${format(new Date(b.sentAt), "d MMM yyyy HH:mm", { locale: ru })}`}
                  </p>
                </div>
                {!b.sentAt && (
                  <button onClick={() => markSent(b.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition cursor-pointer shrink-0">
                    <Send size={14} />Отправить
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* МОДАЛКА */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold text-slate-800">Новая рассылка</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Тема</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Заголовок сообщения" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Получатели</label>
                <div className="flex gap-2">
                  {Object.entries(TARGET_LABELS).map(([key, label]) => (
                    <button key={key} onClick={() => setForm({ ...form, target: key })}
                      className={`flex-1 py-2 text-sm rounded-lg border transition cursor-pointer ${form.target === key ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 hover:border-blue-300"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Текст сообщения</label>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                  rows={5} placeholder="Текст рассылки..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={save} disabled={saving || !form.title || !form.content}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2.5 rounded-lg font-medium transition cursor-pointer">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Сохранить черновик
              </button>
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition cursor-pointer">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
