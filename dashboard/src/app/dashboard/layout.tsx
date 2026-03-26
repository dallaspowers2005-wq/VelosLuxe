"use client";

import { useEffect } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Capture internal key from URL on first load
    const urlKey = new URLSearchParams(window.location.search).get("key");
    if (urlKey) {
      sessionStorage.setItem("internalKey", urlKey);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return <DashboardShell>{children}</DashboardShell>;
}
