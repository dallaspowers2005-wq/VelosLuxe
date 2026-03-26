"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Copy, ExternalLink, Search, Plus } from "lucide-react";
import { toast } from "sonner";

interface Client {
  id: number;
  name: string;
  slug: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  sms_phone_number: string;
  status: string;
  admin_key: string;
  created_at: string;
  assistant_name: string;
  crm_webhook_url: string;
  booking_webhook_url: string;
  google_review_link: string;
  review_delay_minutes: number;
  followup_inactive_days: number;
  followup_enabled: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState<Partial<Client>>({});

  const key = typeof window !== "undefined" ? sessionStorage.getItem("internalKey") || "" : "";
  const headers = { "x-internal-key": key, "Content-Type": "application/json" };

  async function loadClients() {
    try {
      const res = await fetch("/api/internal/clients", { headers });
      setClients(await res.json());
    } catch { /* ignore */ }
  }

  useEffect(() => { loadClients(); }, []);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_name || "").toLowerCase().includes(search.toLowerCase())
  );

  function openEdit(client: Client) {
    setEditClient(client);
    setEditForm({ ...client });
  }

  async function saveEdit() {
    if (!editClient) return;
    try {
      await fetch(`/api/internal/clients/${editClient.id}`, {
        method: "PUT", headers, body: JSON.stringify(editForm),
      });
      toast.success("Client updated");
      setEditClient(null);
      loadClients();
    } catch {
      toast.error("Failed to save");
    }
  }

  function copyDashLink(client: Client) {
    const url = `${window.location.origin}/admin/?key=${client.admin_key}`;
    navigator.clipboard.writeText(url);
    toast.success("Dashboard link copied");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Clients</h1>
          <p className="text-slate-500 mt-1">{clients.length} total clients</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 border border-slate-200 max-w-md">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400 w-full"
        />
      </div>

      {/* Client Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(client => (
          <GlassCard key={client.id} hover onClick={() => openEdit(client)}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900">{client.name}</h3>
                <p className="text-xs text-slate-400 font-mono">{client.slug}</p>
              </div>
              <Badge className={client.status === "active"
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
              }>
                {client.status}
              </Badge>
            </div>

            <div className="space-y-1.5 text-sm text-slate-600">
              {client.contact_name && <p>{client.contact_name}</p>}
              {client.contact_email && <p className="text-xs text-slate-400">{client.contact_email}</p>}
              {client.sms_phone_number && <p className="text-xs text-slate-400">{client.sms_phone_number}</p>}
            </div>

            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={(e) => { e.stopPropagation(); copyDashLink(client); }}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <Copy className="h-3 w-3" /> Copy Link
              </button>
              <a
                href={`/admin/?key=${client.admin_key}`}
                target="_blank"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1 ml-auto"
              >
                <ExternalLink className="h-3 w-3" /> Dashboard
              </a>
            </div>
          </GlassCard>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            {search ? "No clients match your search" : "No clients yet"}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={!!editClient} onClose={() => setEditClient(null)} title={`Edit: ${editClient?.name || ""}`} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Spa Name" value={editForm.name || ""} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Assistant Name" value={editForm.assistant_name || ""} onChange={e => setEditForm(f => ({ ...f, assistant_name: e.target.value }))} />
          <Input label="Contact Name" value={editForm.contact_name || ""} onChange={e => setEditForm(f => ({ ...f, contact_name: e.target.value }))} />
          <Input label="Contact Email" value={editForm.contact_email || ""} onChange={e => setEditForm(f => ({ ...f, contact_email: e.target.value }))} />
          <Input label="Contact Phone" value={editForm.contact_phone || ""} onChange={e => setEditForm(f => ({ ...f, contact_phone: e.target.value }))} />
          <Input label="Google Review Link" value={editForm.google_review_link || ""} onChange={e => setEditForm(f => ({ ...f, google_review_link: e.target.value }))} />
          <Input label="Review Delay (min)" type="number" value={editForm.review_delay_minutes ?? 60} onChange={e => setEditForm(f => ({ ...f, review_delay_minutes: parseInt(e.target.value) }))} />
          <Input label="Followup Inactive Days" type="number" value={editForm.followup_inactive_days ?? 60} onChange={e => setEditForm(f => ({ ...f, followup_inactive_days: parseInt(e.target.value) }))} />
          <Select
            label="Status"
            value={editForm.status || "active"}
            onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
            options={[{ value: "active", label: "Active" }, { value: "paused", label: "Paused" }]}
          />
          <Select
            label="Followup Enabled"
            value={String(editForm.followup_enabled ?? 1)}
            onChange={e => setEditForm(f => ({ ...f, followup_enabled: parseInt(e.target.value) }))}
            options={[{ value: "1", label: "Yes" }, { value: "0", label: "No" }]}
          />
          <Input label="CRM Webhook (legacy)" value={editForm.crm_webhook_url || ""} onChange={e => setEditForm(f => ({ ...f, crm_webhook_url: e.target.value }))} />
          <Input label="Booking Webhook (legacy)" value={editForm.booking_webhook_url || ""} onChange={e => setEditForm(f => ({ ...f, booking_webhook_url: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setEditClient(null)}>Cancel</Button>
          <Button onClick={saveEdit}>Save Changes</Button>
        </div>
      </Modal>
    </div>
  );
}
