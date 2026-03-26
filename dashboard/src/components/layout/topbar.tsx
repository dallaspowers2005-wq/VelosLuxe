"use client";

import { Menu, Bell, Search } from "lucide-react";

interface TopbarProps {
  onMenuClick?: () => void;
  unreadCount?: number;
}

export function Topbar({ onMenuClick, unreadCount = 0 }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 h-18 border-b border-[#E2E8F0] bg-white/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <Menu className="h-5 w-5 text-slate-600" />
        </button>

        <div className="hidden sm:flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-2.5 border border-slate-200 w-72">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients..."
            className="bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400 w-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-colors">
          <Bell className="h-5 w-5 text-slate-500" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4.5 min-w-4.5 flex items-center justify-center px-1">
              {unreadCount}
            </span>
          )}
        </button>
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center ml-1">
          <span className="text-white text-sm font-bold">VL</span>
        </div>
      </div>
    </header>
  );
}
