"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/input";
import { ONBOARDING_STATUSES, CONCIERGE_STATUSES, CONCIERGE_PLATFORMS } from "@/lib/constants";
import { ClipboardList, Mail, Phone, Globe, MapPin, Calendar, ExternalLink, ArrowRight, Copy, Key, Zap } from "lucide-react";
import { toast } from "sonner";

const OAUTH_PLATFORMS = ["Boulevard", "Google Calendar", "Square"];
const API_KEY_PLATFORMS = ["Zenoti", "Acuity"];

interface Submission {
  id: number;
  spa_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  services: string;
  current_platform: string;
  num_locations: number;
  referral_source: string;
  notes: string;
  status: string;
  read: number;
  created_at: string;
  oauth_platform: string | null;
  oauth_status: string | null;
  api_key_token: string | null;
  api_key_submitted_at: string | null;
  concierge_status: string | null;
  concierge_requested_at: string | null;
  concierge_notes: string | null;
}

export default function OnboardingPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Submission | null>(null);
  const [formLink, setFormLink] = useState("");
  const [conciergeCredentials, setConciergeCredentials] = useState("");
  const [conciergeNotesInput, setConciergeNotesInput] = useState("");
  const [activating, setActivating] = useState(false);

  const key = typeof window !== "undefined" ? sessionStorage.getItem("internalKey") || "" : "";
  const headers: Record<string, string> = { "x-internal-key": key, "Content-Type": "application/json" };

  async function loadSubmissions() {
    try {
      const url = filter === "all" ? "/api/internal/onboarding" : `/api/internal/onboarding?status=${filter}`;
      const res = await fetch(url, { headers });
      setSubmissions(await res.json());
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadSubmissions();
    setFormLink(`${window.location.origin}/onboarding`);
  }, [filter]);

  async function openDetail(sub: Submission) {
    // Mark as read
    try {
      await fetch(`/api/internal/onboarding/${sub.id}`, { headers });
    } catch { /* ignore */ }
    setSelected(sub);
    setConciergeNotesInput(sub.concierge_notes || "");
    setConciergeCredentials("");
  }

  async function updateStatus(id: number, status: string) {
    try {
      await fetch(`/api/internal/onboarding/${id}`, {
        method: "PUT", headers, body: JSON.stringify({ status }),
      });
      toast.success(`Status updated to ${status}`);
      setSelected(s => s ? { ...s, status } : null);
      loadSubmissions();
    } catch {
      toast.error("Failed to update");
    }
  }

  async function deleteSubmission(id: number) {
    if (!confirm("Delete this submission?")) return;
    try {
      await fetch(`/api/internal/onboarding/${id}`, { method: "DELETE", headers });
      toast.success("Deleted");
      setSelected(null);
      loadSubmissions();
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function resendLink(id: number) {
    try {
      const res = await fetch(`/api/internal/onboarding/${id}/resend-link`, { method: "POST", headers });
      const data = await res.json();
      if (data.success) {
        toast.success("Connection link sent!");
      } else {
        toast.error(data.error || "Failed to send");
      }
    } catch {
      toast.error("Failed to send");
    }
  }

  async function updateConciergeStatus(id: number, concierge_status: string) {
    try {
      await fetch(`/api/internal/onboarding/${id}/concierge`, {
        method: "PUT", headers, body: JSON.stringify({ concierge_status }),
      });
      toast.success(`Concierge status updated to ${concierge_status}`);
      setSelected(s => s ? { ...s, concierge_status } : null);
      loadSubmissions();
    } catch {
      toast.error("Failed to update concierge status");
    }
  }

  async function saveConciergeNotes(id: number) {
    try {
      await fetch(`/api/internal/onboarding/${id}/concierge`, {
        method: "PUT", headers, body: JSON.stringify({ concierge_notes: conciergeNotesInput }),
      });
      toast.success("Notes saved");
      setSelected(s => s ? { ...s, concierge_notes: conciergeNotesInput } : null);
    } catch {
      toast.error("Failed to save notes");
    }
  }

  async function activateIntegration(id: number) {
    if (!conciergeCredentials.trim()) {
      toast.error("Enter credentials first");
      return;
    }
    setActivating(true);
    try {
      let credentials: Record<string, string>;
      try {
        credentials = JSON.parse(conciergeCredentials);
      } catch {
        credentials = { api_key: conciergeCredentials };
      }
      const res = await fetch(`/api/internal/onboarding/${id}/activate`, {
        method: "POST", headers, body: JSON.stringify({ credentials }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Integration activated!");
        setSelected(s => s ? { ...s, concierge_status: "connected", api_key_submitted_at: new Date().toISOString() } : null);
        setConciergeCredentials("");
        loadSubmissions();
      } else {
        toast.error(data.error || "Activation failed");
      }
    } catch {
      toast.error("Failed to activate");
    }
    setActivating(false);
  }

  function copyConnectLink(id: number) {
    const url = `${window.location.origin}/api/onboarding/${id}/connect`;
    navigator.clipboard.writeText(url);
    toast.success("Connection link copied");
  }

  function getConnectionStatus(sub: Submission) {
    if (sub.oauth_status === "connected") {
      return { label: `${sub.oauth_platform || sub.current_platform}: Connected`, color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    }
    if (sub.api_key_submitted_at && !CONCIERGE_PLATFORMS.includes(sub.current_platform)) {
      return { label: `${sub.current_platform} key received`, color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    }
    if (CONCIERGE_PLATFORMS.includes(sub.current_platform)) {
      const status = CONCIERGE_STATUSES.find(s => s.value === sub.concierge_status);
      if (status) {
        return { label: `Concierge: ${status.label}`, color: status.color.replace("bg-", "bg-").replace("text-", "text-") };
      }
      return { label: "Concierge: Pending", color: "text-slate-700 bg-slate-50 border-slate-200" };
    }
    if (API_KEY_PLATFORMS.includes(sub.current_platform)) {
      return { label: "Waiting for client", color: "text-amber-700 bg-amber-50 border-amber-200" };
    }
    if (OAUTH_PLATFORMS.includes(sub.current_platform)) {
      return { label: "OAuth pending", color: "text-amber-700 bg-amber-50 border-amber-200" };
    }
    return null;
  }

  function getStatusBadge(status: string) {
    const s = ONBOARDING_STATUSES.find(os => os.value === status);
    return s ? s.color : "bg-slate-100 text-slate-600 border-slate-200";
  }

  function formatDate(iso: string) {
    if (!iso) return "—";
    const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  const newCount = submissions.filter(s => s.status === "new").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Onboarding Queue</h1>
          <p className="text-slate-500 mt-1">{submissions.length} submissions{newCount > 0 ? ` (${newCount} new)` : ""}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(formLink); toast.success("Onboarding form link copied"); }}>
          <Copy className="h-4 w-4" /> Copy Form Link
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === "all" ? "bg-indigo-100 text-indigo-700" : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"}`}
        >
          All
        </button>
        {ONBOARDING_STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === s.value ? "bg-indigo-100 text-indigo-700" : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {submissions.map(sub => (
          <GlassCard key={sub.id} hover padding="sm" onClick={() => openDetail(sub)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${!sub.read ? "bg-indigo-100" : "bg-slate-100"}`}>
                  <ClipboardList className={`h-5 w-5 ${!sub.read ? "text-indigo-600" : "text-slate-400"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-sm ${!sub.read ? "text-slate-900" : "text-slate-700"}`}>{sub.spa_name}</h3>
                    {!sub.read && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                  </div>
                  <p className="text-xs text-slate-400">
                    {sub.contact_name}
                    {sub.current_platform ? ` · ${sub.current_platform}` : ""}
                    {sub.num_locations > 1 ? ` · ${sub.num_locations} locations` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={getStatusBadge(sub.status)}>{sub.status}</Badge>
                <span className="text-xs text-slate-400 hidden sm:block">{formatDate(sub.created_at)}</span>
                <ArrowRight className="h-4 w-4 text-slate-300" />
              </div>
            </div>
          </GlassCard>
        ))}

        {submissions.length === 0 && (
          <div className="text-center py-16">
            <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No submissions{filter !== "all" ? ` with status "${filter}"` : ""}</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => { setSelected(null); loadSubmissions(); }} title={selected?.spa_name || ""} size="lg">
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Badge className={getStatusBadge(selected.status)}>{selected.status}</Badge>
              <span className="text-xs text-slate-400">{formatDate(selected.created_at)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={<ClipboardList className="h-4 w-4" />} label="Contact" value={selected.contact_name} />
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={selected.contact_email} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={selected.contact_phone} />
              <InfoRow icon={<Globe className="h-4 w-4" />} label="Website" value={selected.website} link />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Locations" value={String(selected.num_locations || 1)} />
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Current Platform" value={selected.current_platform} />
            </div>

            {selected.current_platform && selected.current_platform !== "None" && selected.current_platform !== "Other" && (() => {
              const connStatus = getConnectionStatus(selected);
              return connStatus ? (
                <div className={`border rounded-xl p-4 ${connStatus.color}`}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2">Platform Connection</p>
                  <p className="text-sm font-semibold">{connStatus.label}</p>
                  {selected.api_key_submitted_at && (
                    <p className="text-xs mt-1 opacity-75">Submitted {formatDate(selected.api_key_submitted_at)}</p>
                  )}
                  {API_KEY_PLATFORMS.includes(selected.current_platform) && !selected.api_key_submitted_at && (
                    <div className="flex gap-2 mt-3">
                      <Button variant="secondary" size="sm" onClick={() => resendLink(selected.id)}>
                        <Mail className="h-3 w-3" /> Resend Link
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => copyConnectLink(selected.id)}>
                        <Copy className="h-3 w-3" /> Copy Link
                      </Button>
                    </div>
                  )}
                </div>
              ) : null;
            })()}

            {/* Concierge Pipeline */}
            {CONCIERGE_PLATFORMS.includes(selected.current_platform) && (
              <div className="border border-indigo-200 bg-indigo-50/50 rounded-xl p-4 space-y-4">
                <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Concierge Pipeline</p>

                {/* Status timeline */}
                <div className="flex flex-wrap gap-2">
                  {CONCIERGE_STATUSES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => updateConciergeStatus(selected.id, s.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        selected.concierge_status === s.value
                          ? s.color
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {selected.concierge_requested_at && (
                  <p className="text-xs text-indigo-600">Requested: {formatDate(selected.concierge_requested_at)}</p>
                )}

                {/* Enter Credentials (when credentials_received) */}
                {(selected.concierge_status === "credentials_received" || selected.concierge_status === "connected") && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <Key className="h-3 w-3 inline mr-1" />
                      Enter Credentials
                    </label>
                    <textarea
                      value={conciergeCredentials}
                      onChange={e => setConciergeCredentials(e.target.value)}
                      placeholder='Paste API key or JSON: {"client_id": "...", "client_secret": "..."}'
                      rows={3}
                      className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 resize-none"
                    />
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => activateIntegration(selected.id)}
                      disabled={activating || !conciergeCredentials.trim()}
                    >
                      <Zap className="h-3 w-3" />
                      {activating ? "Activating..." : "Activate Integration"}
                    </Button>
                  </div>
                )}

                {/* Concierge notes */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Internal Notes</label>
                  <textarea
                    value={conciergeNotesInput}
                    onChange={e => setConciergeNotesInput(e.target.value)}
                    placeholder="Track progress: who you contacted, ticket numbers, etc."
                    rows={2}
                    className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 resize-none"
                  />
                  <Button variant="secondary" size="sm" onClick={() => saveConciergeNotes(selected.id)}>
                    Save Notes
                  </Button>
                </div>
              </div>
            )}

            {selected.services && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Services</p>
                <p className="text-sm text-slate-700">{selected.services}</p>
              </div>
            )}

            {selected.referral_source && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">How They Found Us</p>
                <p className="text-sm text-slate-700">{selected.referral_source}</p>
              </div>
            )}

            {selected.notes && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.notes}</p>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {ONBOARDING_STATUSES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => updateStatus(selected.id, s.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      selected.status === s.value
                        ? s.color
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="danger" size="sm" onClick={() => deleteSubmission(selected.id)}>Delete</Button>
              <Button variant="secondary" size="sm" onClick={() => { setSelected(null); loadSubmissions(); }}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoRow({ icon, label, value, link }: { icon: React.ReactNode; label: string; value?: string; link?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-400 mt-0.5">{icon}</span>
      <div>
        <p className="text-[10px] text-slate-400 uppercase font-semibold">{label}</p>
        {link ? (
          <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
            {value} <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <p className="text-sm text-slate-700">{value}</p>
        )}
      </div>
    </div>
  );
}
