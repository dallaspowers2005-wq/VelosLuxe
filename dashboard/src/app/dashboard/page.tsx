"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Users, Phone, MessageSquare, ClipboardList, TrendingUp, ArrowUpRight, CalendarCheck } from "lucide-react";
import Link from "next/link";

interface Stats {
  activeClients: number;
  totalLeads: number;
  totalCalls: number;
  totalSms: number;
}

interface StrategyCall {
  id: number;
  name: string;
  email: string;
  phone: string;
  spa_name: string;
  start_time: string;
  services: string;
  revenue: string;
  challenges: string;
  source: string;
  status: string;
  created_at: string;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [onboardingCount, setOnboardingCount] = useState(0);
  const [recentOnboarding, setRecentOnboarding] = useState<any[]>([]);
  const [strategyCalls, setStrategyCalls] = useState<StrategyCall[]>([]);

  useEffect(() => {
    const key = sessionStorage.getItem("internalKey") || "";
    const headers = { "x-internal-key": key };

    fetch("/api/internal/overview", { headers }).then(r => r.json()).then(setStats).catch(() => {});
    fetch("/api/internal/onboarding/unread", { headers }).then(r => r.json()).then(d => setOnboardingCount(d.count || 0)).catch(() => {});
    fetch("/api/internal/onboarding?status=new", { headers }).then(r => r.json()).then(d => setRecentOnboarding(d.slice(0, 5))).catch(() => {});
    fetch("/api/internal/strategy-calls", { headers }).then(r => r.json()).then(d => setStrategyCalls(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const statCards = [
    { label: "Active Clients", value: stats?.activeClients ?? "—", icon: Users, color: "text-indigo-600 bg-indigo-100" },
    { label: "Total Calls", value: stats?.totalCalls ?? "—", icon: Phone, color: "text-purple-600 bg-purple-100" },
    { label: "Total Leads", value: stats?.totalLeads ?? "—", icon: TrendingUp, color: "text-emerald-600 bg-emerald-100" },
    { label: "Messages", value: stats?.totalSms ?? "—", icon: MessageSquare, color: "text-amber-600 bg-amber-100" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Overview</h1>
        <p className="text-slate-500 mt-1">VelosLuxe operations at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <GlassCard key={s.label} hover>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-2">{s.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${s.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Strategy Calls */}
      {strategyCalls.length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-emerald-500" />
              <h2 className="text-lg font-bold text-slate-900">Strategy Calls</h2>
            </div>
            <span className="bg-emerald-100 text-emerald-600 text-xs font-bold rounded-full px-3 py-1">
              {strategyCalls.length} booked
            </span>
          </div>
          <div className="space-y-3">
            {strategyCalls.map((sc) => {
              const callDate = sc.start_time ? new Date(sc.start_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No time set';
              return (
                <div key={sc.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{sc.name}{sc.spa_name ? ` — ${sc.spa_name}` : ''}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{sc.email} &middot; {sc.phone}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.status === 'booked' ? 'bg-blue-100 text-blue-600' : sc.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                      {sc.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 font-medium">{callDate}</p>
                  {sc.services && <p className="text-xs text-slate-400 mt-1">Services: {sc.services}</p>}
                  {sc.revenue && <p className="text-xs text-slate-400">Revenue: {sc.revenue}</p>}
                  {sc.challenges && <p className="text-xs text-slate-400">Challenges: {sc.challenges}</p>}
                  {sc.source && <p className="text-xs text-slate-400">Source: {sc.source}</p>}
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* New Onboarding Submissions */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">New Onboarding Submissions</h2>
            {onboardingCount > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-bold rounded-full px-3 py-1">
                {onboardingCount} new
              </span>
            )}
          </div>

          {recentOnboarding.length === 0 ? (
            <p className="text-slate-400 text-sm py-4">No new submissions</p>
          ) : (
            <div className="space-y-3">
              {recentOnboarding.map((sub: any) => (
                <Link
                  key={sub.id}
                  href="/dashboard/onboarding"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                >
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{sub.spa_name}</p>
                    <p className="text-xs text-slate-400">{sub.contact_name} &middot; {sub.contact_email || sub.contact_phone || "No contact"}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-300" />
                </Link>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Quick Actions */}
        <GlassCard>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link href="/dashboard/onboarding" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700">
              <ClipboardList className="h-5 w-5 text-indigo-500" />
              Review Onboarding Queue
            </Link>
            <Link href="/dashboard/clients" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700">
              <Users className="h-5 w-5 text-purple-500" />
              Manage Clients
            </Link>
            <a
              href="/onboarding"
              target="_blank"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
            >
              <ArrowUpRight className="h-5 w-5 text-emerald-500" />
              View Onboarding Form
            </a>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
