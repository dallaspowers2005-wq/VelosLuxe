"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const key = sessionStorage.getItem("internalKey") || "";
    async function fetchUnread() {
      try {
        const res = await fetch("/api/internal/onboarding/unread", {
          headers: { "x-internal-key": key },
        });
        const data = await res.json();
        setUnreadCount(data.count || 0);
      } catch {
        // ignore
      }
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <Sidebar unreadCount={unreadCount} />

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="h-full w-64 border-r border-[#E2E8F0] bg-[#F1F5F9]"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar unreadCount={unreadCount} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <Topbar
          onMenuClick={() => setMobileMenuOpen(true)}
          unreadCount={unreadCount}
        />
        <main className="p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
