"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Users, ExternalLink, Mail, Phone } from "lucide-react";

interface Client {
  id: number;
  name: string;
  slug: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  admin_key: string;
  created_at: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = sessionStorage.getItem("internalKey") || "";
    fetch("/api/internal/clients", { headers: { "x-internal-key": key } })
      .then(r => r.json())
      .then(d => { setClients(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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
        <h1 className="text-3xl font-extrabold text-slate-900">Clients</h1>
        <p className="text-slate-500 mt-1">Manage your active med spa clients</p>
      </div>

      {clients.length === 0 ? (
        <GlassCard padding="lg">
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">No clients yet</h3>
            <p className="text-slate-400 text-sm">Clients will appear here once they are onboarded.</p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((c) => (
            <GlassCard key={c.id} hover>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-900">{c.name}</h3>
                  <p className="text-xs text-slate-400">{c.slug}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {c.status}
                </span>
              </div>
              {c.contact_name && <p className="text-sm text-slate-600 mb-1">{c.contact_name}</p>}
              <div className="space-y-1 text-sm text-slate-400">
                {c.contact_email && (
                  <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{c.contact_email}</p>
                )}
                {c.contact_phone && (
                  <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{c.contact_phone}</p>
                )}
              </div>
              {c.admin_key && (
                <a
                  href={`/admin/?key=${c.admin_key}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium mt-3 hover:text-indigo-800"
                >
                  <ExternalLink className="h-3 w-3" /> View Dashboard
                </a>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
