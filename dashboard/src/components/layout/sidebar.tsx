"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";

interface SidebarProps {
  unreadCount?: number;
}

export function Sidebar({ unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-[#E2E8F0] bg-[#F1F5F9] hidden lg:flex flex-col z-40">
      {/* Logo */}
      <div className="h-18 flex items-center gap-3 px-6 border-b border-[#E2E8F0]">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
            VELOS<span className="text-indigo-600">LUXE</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-medium -mt-0.5">Operations Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          const isOnboarding = item.label === "Onboarding";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent"
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
              {isOnboarding && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#E2E8F0]">
        <p className="text-[11px] text-slate-400">VelosLuxe v2.0</p>
      </div>
    </aside>
  );
}
