"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { ClipboardList, Mail, Phone, Globe } from "lucide-react";

interface Submission {
  id: number;
  spa_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  current_platform: string;
  status: string;
  created_at: string;
}

export default function OnboardingPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = sessionStorage.getItem("internalKey") || "";
    fetch("/api/internal/onboarding", { headers: { "x-internal-key": key } })
      .then(r => r.json())
      .then(d => { setSubmissions(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const statusColor = (s: string) => {
    switch (s) {
      case "new": return "bg-blue-100 text-blue-700";
      case "contacted": return "bg-cyan-100 text-cyan-700";
      case "in_progress": return "bg-purple-100 text-purple-700";
      case "provisioned": return "bg-emerald-100 text-emerald-700";
      case "declined": return "bg-red-100 text-red-700";
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
        <h1 className="text-3xl font-extrabold text-slate-900">Onboarding</h1>
        <p className="text-slate-500 mt-1">Review and process new client submissions</p>
      </div>

      {submissions.length === 0 ? (
        <GlassCard padding="lg">
          <div className="text-center py-12">
            <ClipboardList className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">No submissions yet</h3>
            <p className="text-slate-400 text-sm">New onboarding submissions will appear here.</p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <GlassCard key={sub.id} hover>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">{sub.spa_name || "Unnamed Spa"}</h3>
                  <p className="text-sm text-slate-500">{sub.contact_name}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor(sub.status)}`}>
                  {sub.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-400">
                {sub.contact_email && (
                  <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{sub.contact_email}</span>
                )}
                {sub.contact_phone && (
                  <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{sub.contact_phone}</span>
                )}
                {sub.website && (
                  <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{sub.website}</span>
                )}
              </div>
              {sub.current_platform && (
                <p className="text-xs text-slate-300 mt-2">Platform: {sub.current_platform}</p>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
