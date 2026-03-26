"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import {
  CalendarCheck, Phone, TrendingUp, Clock,
  ArrowUpRight, Users, Mail, MapPin, Briefcase,
  DollarSign, AlertCircle, ExternalLink
} from "lucide-react";

interface StrategyCall {
  id: number;
  booking_id: number | null;
  name: string;
  email: string;
  phone: string;
  spa_name: string;
  start_time: string;
  end_time: string;
  services: string;
  revenue: string;
  challenges: string;
  source: string;
  status: string;
  created_at: string;
}

interface Stats {
  activeClients: number;
  totalLeads: number;
  totalCalls: number;
  totalSms: number;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [strategyCalls, setStrategyCalls] = useState<StrategyCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = sessionStorage.getItem("internalKey") || "";
    const headers = { "x-internal-key": key };

    Promise.all([
      fetch("/api/internal/overview", { headers }).then(r => r.json()).catch(() => null),
      fetch("/api/internal/strategy-calls", { headers }).then(r => r.json()).catch(() => []),
    ]).then(([s, sc]) => {
      setStats(s);
      setStrategyCalls(Array.isArray(sc) ? sc : []);
      setLoading(false);
    });
  }, []);

  const upcoming = strategyCalls.filter(sc => sc.status === "booked" && new Date(sc.start_time) > new Date());
  const past = strategyCalls.filter(sc => sc.status !== "booked" || new Date(sc.start_time) <= new Date());

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };
  const timeUntil = (iso: string) => {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff < 0) return "Past";
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `in ${days}d`;
    if (hours > 0) return `in ${hours}h`;
    return `in ${Math.floor(diff / 60000)}m`;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "booked": return "bg-blue-100 text-blue-700";
      case "completed": return "bg-emerald-100 text-emerald-700";
      case "no_show": return "bg-red-100 text-red-700";
      case "cancelled": return "bg-slate-100 text-slate-500";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Command Center</h1>
        <p className="text-slate-500 mt-1">Your VelosLuxe launch at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Strategy Calls</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{strategyCalls.length}</p>
              <p className="text-xs text-slate-400 mt-1">{upcoming.length} upcoming</p>
            </div>
            <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-indigo-100 text-indigo-600">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Leads</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats?.totalLeads ?? 0}</p>
            </div>
            <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-emerald-100 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Clients</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats?.activeClients ?? 0}</p>
            </div>
            <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-purple-100 text-purple-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Calls</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats?.totalCalls ?? 0}</p>
            </div>
            <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-amber-100 text-amber-600">
              <Phone className="h-5 w-5" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Upcoming Strategy Calls */}
      <GlassCard padding="lg">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Upcoming Strategy Calls</h2>
          </div>
          {upcoming.length > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full px-3 py-1">
              {upcoming.length} booked
            </span>
          )}
        </div>

        {upcoming.length === 0 ? (
          <div className="text-center py-8">
            <CalendarCheck className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No upcoming calls</p>
            <p className="text-slate-300 text-xs mt-1">Strategy calls will appear here when prospects book</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.map((sc) => (
              <div key={sc.id} className="border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{sc.name}</h3>
                    {sc.spa_name && <p className="text-sm text-indigo-600 font-medium">{sc.spa_name}</p>}
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor(sc.status)}`}>
                      {sc.status}
                    </span>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{timeUntil(sc.start_time)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(sc.start_time)} at {formatTime(sc.start_time)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {sc.email && (
                    <a href={`mailto:${sc.email}`} className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition-colors">
                      <Mail className="h-3.5 w-3.5" /> {sc.email}
                    </a>
                  )}
                  {sc.phone && (
                    <a href={`tel:${sc.phone}`} className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition-colors">
                      <Phone className="h-3.5 w-3.5" /> {sc.phone}
                    </a>
                  )}
                </div>

                {(sc.services || sc.revenue || sc.challenges) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {sc.services && (
                      <div>
                        <span className="font-semibold text-slate-400 uppercase tracking-wider">Services</span>
                        <p className="text-slate-600 mt-0.5">{sc.services}</p>
                      </div>
                    )}
                    {sc.revenue && (
                      <div>
                        <span className="font-semibold text-slate-400 uppercase tracking-wider">Revenue</span>
                        <p className="text-slate-600 mt-0.5">{sc.revenue}</p>
                      </div>
                    )}
                    {sc.challenges && (
                      <div>
                        <span className="font-semibold text-slate-400 uppercase tracking-wider">Challenges</span>
                        <p className="text-slate-600 mt-0.5">{sc.challenges}</p>
                      </div>
                    )}
                  </div>
                )}
                {sc.source && (
                  <p className="text-xs text-slate-300 mt-2">Source: {sc.source}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Past / All Calls */}
      {past.length > 0 && (
        <GlassCard>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Past Calls</h2>
          <div className="space-y-2">
            {past.map((sc) => (
              <div key={sc.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{sc.name}{sc.spa_name ? ` — ${sc.spa_name}` : ""}</p>
                  <p className="text-xs text-slate-400">{formatDate(sc.start_time)} at {formatTime(sc.start_time)}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor(sc.status)}`}>
                  {sc.status}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href="/strategy-call" target="_blank" className="group">
          <GlassCard hover>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-indigo-100 text-indigo-600">
                <ExternalLink className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Booking Page</p>
                <p className="text-xs text-slate-400">View live strategy call page</p>
              </div>
            </div>
          </GlassCard>
        </a>
        <a href="/dashboard/clients">
          <GlassCard hover>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-purple-100 text-purple-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">Clients</p>
                <p className="text-xs text-slate-400">Manage active clients</p>
              </div>
            </div>
          </GlassCard>
        </a>
        <a href="/dashboard/onboarding">
          <GlassCard hover>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">Onboarding</p>
                <p className="text-xs text-slate-400">Review new submissions</p>
              </div>
            </div>
          </GlassCard>
        </a>
      </div>
    </div>
  );
}
