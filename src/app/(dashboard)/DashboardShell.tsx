"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  role: string;
  userName: string;
}

export default function DashboardShell({ children, role, userName }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        role={role}
        userName={userName}
      />

      {/* Топбар */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4 shadow-sm">
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-600 cursor-pointer"
          aria-label="Открыть меню"
        >
          <Menu size={22} />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">Tikhov Med School</h1>
      </header>

      {/* Контент */}
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}
