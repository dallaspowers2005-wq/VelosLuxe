"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { Plug, Plus, TestTube, Trash2, RefreshCw, Wifi } from "lucide-react";
import { toast } from "sonner";

interface Platform {
  platformName: string;
  displayName: string;
  authType: string;
  capabilities: { booking: boolean; crm: boolean };
  credentialFields: { key: string; label: string; type: string; oauth?: boolean }[];
  configFields: { key: string; label: string; type: string }[];
  oauthConfig: { authorizeUrl: string; scopes: string } | null;
}

interface Integration {
  id: number;
  client_id: number;
  platform: string;
  purpose: string;
  auth_type: string;
  credentials: string;
  config: string;
  status: string;
  last_error: string;
  created_at: string;
}

interface Client {
  id: number;
  name: string;
  slug: string;
}

export default function IntegrationsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [addPlatform, setAddPlatform] = useState("");
  const [addCreds, setAddCreds] = useState<Record<string, string>>({});
  const [addConfig, setAddConfig] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  const key = typeof window !== "undefined" ? sessionStorage.getItem("internalKey") || "" : "";
  const headers: Record<string, string> = { "x-internal-key": key, "Content-Type": "application/json" };

  useEffect(() => {
    fetch("/api/internal/clients", { headers }).then(r => r.json()).then(setClients).catch(() => {});
    fetch("/api/internal/platforms", { headers }).then(r => r.json()).then(setPlatforms).catch(() => {});
  }, []);

  async function loadIntegrations(clientId: number) {
    try {
      const res = await fetch(`/api/internal/clients/${clientId}/integrations`, { headers });
      setIntegrations(await res.json());
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (selectedClient) loadIntegrations(selectedClient);
    else setIntegrations([]);
  }, [selectedClient]);

  function getPlatformMeta(name: string) {
    return platforms.find(p => p.platformName === name);
  }

  async function testIntegration(clientId: number, intId: number) {
    try {
      const res = await fetch(`/api/internal/clients/${clientId}/integrations/${intId}/test`, { method: "POST", headers });
      const result = await res.json();
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      loadIntegrations(clientId);
    } catch {
      toast.error("Test failed");
    }
  }

  async function removeIntegration(clientId: number, intId: number) {
    if (!confirm("Remove this integration?")) return;
    try {
      await fetch(`/api/internal/clients/${clientId}/integrations/${intId}`, { method: "DELETE", headers });
      toast.success("Removed");
      loadIntegrations(clientId);
    } catch {
      toast.error("Failed to remove");
    }
  }

  function connectOAuth(platform: string, clientId: number) {
    window.open(`/api/internal/oauth/${platform}/authorize?client_id=${clientId}&internal_key=${key}`, "_blank", "width=600,height=700");
  }

  async function addIntegration() {
    if (!selectedClient || !addPlatform) return;
    const meta = getPlatformMeta(addPlatform);

    if (meta?.authType === "oauth") {
      connectOAuth(addPlatform, selectedClient);
      setAddModal(false);
      return;
    }

    setAdding(true);
    try {
      const purpose = meta?.capabilities.booking && meta?.capabilities.crm ? "both"
        : meta?.capabilities.booking ? "booking" : "crm";

      const res = await fetch(`/api/internal/clients/${selectedClient}/integrations`, {
        method: "POST", headers,
        body: JSON.stringify({
          platform: addPlatform,
          purpose,
          auth_type: meta?.authType || "api_key",
          credentials: addCreds,
          config: addConfig,
        }),
      });
      const result = await res.json();

      if (result.success) {
        toast.success("Integration added and connection verified");
        setAddModal(false);
        setAddPlatform("");
        setAddCreds({});
        setAddConfig({});
        loadIntegrations(selectedClient);
      } else {
        toast.error(result.error || "Failed to add");
      }
    } catch {
      toast.error("Network error");
    }
    setAdding(false);
  }

  const currentMeta = getPlatformMeta(addPlatform);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Integrations</h1>
        <p className="text-slate-500 mt-1">Manage platform connections per client</p>
      </div>

      {/* Client Selector */}
      <GlassCard>
        <Select
          label="Select Client"
          value={selectedClient ? String(selectedClient) : ""}
          onChange={e => setSelectedClient(e.target.value ? parseInt(e.target.value) : null)}
          options={[
            { value: "", label: "— Choose a client —" },
            ...clients.map(c => ({ value: String(c.id), label: `${c.name} (${c.slug})` })),
          ]}
        />
      </GlassCard>

      {selectedClient && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              {clients.find(c => c.id === selectedClient)?.name} — Integrations
            </h2>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => loadIntegrations(selectedClient)}>
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
              <Button size="sm" onClick={() => { setAddModal(true); setAddPlatform(""); setAddCreds({}); setAddConfig({}); }}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>

          {/* Integration Cards */}
          {integrations.length === 0 ? (
            <div className="text-center py-12">
              <Plug className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No integrations configured</p>
              <p className="text-slate-400 text-sm">Click "Add" to connect a platform</p>
            </div>
          ) : (
            <div className="space-y-3">
              {integrations.map(int => {
                const meta = getPlatformMeta(int.platform);
                return (
                  <GlassCard key={int.id} padding="sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                          int.status === "active" ? "bg-emerald-100" : int.status === "error" ? "bg-red-100" : "bg-slate-100"
                        }`}>
                          <Wifi className={`h-5 w-5 ${
                            int.status === "active" ? "text-emerald-600" : int.status === "error" ? "text-red-600" : "text-slate-400"
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">{meta?.displayName || int.platform}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge className={
                              int.status === "active" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : int.status === "error" ? "bg-red-100 text-red-700 border-red-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                            }>{int.status}</Badge>
                            <span className="text-xs text-slate-400">{int.purpose}</span>
                            <span className="text-xs text-slate-400">{int.auth_type}</span>
                          </div>
                          {int.last_error && <p className="text-xs text-red-500 mt-1">{int.last_error}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {meta?.authType === "oauth" && (
                          <Button variant="ghost" size="sm" onClick={() => connectOAuth(int.platform, selectedClient)}>
                            Reconnect
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => testIntegration(selectedClient, int.id)}>
                          <TestTube className="h-4 w-4" /> Test
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => removeIntegration(selectedClient, int.id)}>
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add Integration Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Integration" size="md">
        <div className="space-y-4">
          <Select
            label="Platform"
            value={addPlatform}
            onChange={e => { setAddPlatform(e.target.value); setAddCreds({}); setAddConfig({}); }}
            options={[
              { value: "", label: "— Select platform —" },
              ...platforms.map(p => ({ value: p.platformName, label: p.displayName })),
            ]}
          />

          {currentMeta?.authType === "oauth" && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-700">
              This platform uses OAuth. Clicking "Connect" will open a new window for authorization.
            </div>
          )}

          {currentMeta && currentMeta.authType !== "oauth" && (
            <>
              {currentMeta.credentialFields.filter(f => !f.oauth).map(f => (
                <Input
                  key={f.key}
                  label={f.label}
                  type={f.type === "textarea" ? "text" : f.type || "text"}
                  value={addCreds[f.key] || ""}
                  onChange={e => setAddCreds(c => ({ ...c, [f.key]: e.target.value }))}
                />
              ))}
              {currentMeta.configFields.map(f => (
                <Input
                  key={f.key}
                  label={f.label}
                  type={f.type === "textarea" ? "text" : f.type || "text"}
                  value={addConfig[f.key] || ""}
                  onChange={e => setAddConfig(c => ({ ...c, [f.key]: e.target.value }))}
                />
              ))}
            </>
          )}

          {addPlatform && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              Capabilities:
              {currentMeta?.capabilities.booking && <Badge className="bg-blue-100 text-blue-700 border-blue-200">Booking</Badge>}
              {currentMeta?.capabilities.crm && <Badge className="bg-purple-100 text-purple-700 border-purple-200">CRM</Badge>}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button onClick={addIntegration} loading={adding} disabled={!addPlatform}>
              {currentMeta?.authType === "oauth" ? "Connect" : "Test & Add"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
