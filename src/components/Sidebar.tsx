"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Users,
  Calendar,
  CreditCard,
  Clock,
  Send,
  Building2,
  X,
  LogOut,
  GraduationCap,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  role: string;
  userName: string;
}

const allMenuItems = [
  { href: "/clients", label: "Клиенты", icon: Users, roles: ["admin", "teacher"] },
  { href: "/calendar", label: "Календарь занятий", icon: Calendar, roles: ["admin", "teacher"] },
  { href: "/subscriptions", label: "Абонементы", icon: CreditCard, roles: ["admin"] },
  { href: "/schedule", label: "Расписание", icon: Clock, roles: ["admin", "teacher", "student"] },
  { href: "/broadcasts", label: "Рассылки", icon: Send, roles: ["admin"] },
  { href: "/company", label: "Компания", icon: Building2, roles: ["admin"] },
];

export default function Sidebar({ isOpen, onClose, role, userName }: SidebarProps) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const menuItems = allMenuItems.filter((item) => item.roles.includes(role));

  // Закрытие по Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const roleLabels: Record<string, string> = {
    admin: "Администратор",
    teacher: "Преподаватель",
    student: "Ученик",
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? "active" : ""}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <nav ref={sidebarRef} className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* Шапка сайдбара */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm leading-tight">Tikhov Med</div>
              <div className="text-slate-400 text-xs">School</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Пользователь */}
        <div className="px-4 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-white font-semibold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-white text-sm font-medium truncate max-w-[150px]">{userName}</div>
              <div className="text-slate-400 text-xs">{roleLabels[role] ?? role}</div>
            </div>
          </div>
        </div>

        {/* Меню */}
        <ul className="py-3 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Выход */}
        <div className="p-4 border-t border-slate-700 mt-auto">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 text-slate-400 hover:text-white transition text-sm w-full px-2 py-2 rounded hover:bg-slate-700 cursor-pointer"
          >
            <LogOut size={16} />
            Выйти
          </button>
        </div>
      </nav>
    </>
  );
}
