"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { Plug } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Integrations</h1>
        <p className="text-slate-500 mt-1">Platform connections for your clients</p>
      </div>
      <GlassCard padding="lg">
        <div className="text-center py-12">
          <Plug className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No integrations yet</h3>
          <p className="text-slate-400 text-sm">Integrations will be configured here once clients are onboarded.</p>
        </div>
      </GlassCard>
    </div>
  );
}
