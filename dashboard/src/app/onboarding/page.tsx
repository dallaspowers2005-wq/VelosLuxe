"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles, CheckCircle, ArrowRight, ArrowLeft, Key, PhoneCall,
  Clock, Calendar, Building2, User, Plug,
  Shield, Star, Zap, MessageSquare,
} from "lucide-react";
import { PLATFORMS, CONCIERGE_PLATFORMS, CALENDLY_URL } from "@/lib/constants";

// ═══ Theme Tokens ═══
const T = {
  bg: "#ffffff",
  bgSoft: "#f9fafb",
  bgMuted: "#f3f4f6",
  border: "#e5e7eb",
  borderDark: "#d1d5db",
  text: "#1f2937",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  gold: "#c9a46c",
  goldLight: "#e2c99b",
  goldHover: "#d4b380",
  goldBg: "rgba(201,164,108,.06)",
  goldBorder: "rgba(201,164,108,.2)",
  green: "#059669",
  greenBg: "#ecfdf5",
  red: "#dc2626",
  redBg: "#fef2f2",
  violet: "#7c3aed",
  violetBg: "#f5f3ff",
  blue: "#2563eb",
  blueBg: "#eff6ff",
};

// ═══ Platform Tiers ═══
const OAUTH_PLATFORMS = ["Boulevard", "Google Calendar", "Square"];
const API_KEY_PLATFORMS = ["Zenoti", "Acuity"];

// ═══ Preset Services ═══
const PRESET_SERVICES = [
  "Botox", "Fillers", "Laser Hair Removal", "Chemical Peels",
  "Microneedling", "Facials", "PRP/PRF", "Body Contouring",
  "IV Therapy", "Lip Filler", "Sculptra", "HydraFacial",
  "Skin Tightening", "Tattoo Removal", "Semaglutide/Weight Loss",
];

// ═══ Platform Metadata ═══
const PLATFORM_META: Record<string, { description: string; tier: string }> = {
  Boulevard:         { description: "One-click connect", tier: "oauth" },
  "Google Calendar": { description: "One-click connect", tier: "oauth" },
  Square:            { description: "One-click connect", tier: "oauth" },
  Zenoti:            { description: "Paste your API key", tier: "api_key" },
  Acuity:            { description: "Paste your API key", tier: "api_key" },
  Vagaro:            { description: "We walk you through it", tier: "concierge" },
  Mangomint:         { description: "We walk you through it", tier: "concierge" },
  AestheticsPro:     { description: "We walk you through it", tier: "concierge" },
  Other:             { description: "We\u2019ll figure it out together", tier: "other" },
  None:              { description: "No booking system yet", tier: "none" },
};

// ═══ Types ═══
interface PlatformInstructions {
  steps: { number: number; text: string }[];
  prerequisites?: string;
  fields: { key: string; label: string; required: boolean; placeholder?: string }[];
  note?: string;
}
interface ConciergeInfo { timeline: string; speedUpTip: string; action?: string; copyText?: string | null; }

const CONCIERGE_INFO: Record<string, ConciergeInfo> = {
  Vagaro: {
    timeline: "3\u20135 business days",
    speedUpTip: "Log into Vagaro \u2192 Settings \u2192 Developers \u2192 APIs & Webhooks, then submit the API request form. Once approved, we\u2019ll handle the rest.",
    action: "Submit a quick API request in your Vagaro settings",
    copyText: null,
  } as ConciergeInfo,
  Mangomint: {
    timeline: "1\u20133 business days",
    speedUpTip: "Open Mangomint\u2019s in-app chat (bottom-right corner) and send the message below. That\u2019s it \u2014 they handle the rest.",
    action: "Send a quick message to Mangomint support",
    copyText: "Hi! We\u2019re connecting with VelosLuxe for AI receptionist integration. Can you enable API access for our account?",
  } as ConciergeInfo,
  AestheticsPro: {
    timeline: "1\u20133 business days",
    speedUpTip: "Email AestheticsPro support requesting API access. Mention you\u2019re integrating with VelosLuxe.",
    action: "Send a quick email to AestheticsPro support",
    copyText: "Hi, I\u2019d like to request API access for my account. We\u2019re integrating with VelosLuxe for AI receptionist services. Thank you!",
  } as ConciergeInfo,
};

const API_KEY_INSTRUCTIONS: Record<string, PlatformInstructions> = {
  Zenoti: {
    prerequisites: "You need organization-level admin access with \u201CManage API Keys\u201D permission enabled.",
    steps: [
      { number: 1, text: "Log into Zenoti at the organization level" },
      { number: 2, text: "Click the Configuration (gear) icon in the top navigation" },
      { number: 3, text: "Navigate to Integrations \u2192 Apps" },
      { number: 4, text: "Click Add to create a new app" },
      { number: 5, text: "Select data permissions: appointments, guests, invoices" },
      { number: 6, text: "Under APIKEY GROUPS, check the needed API groups" },
      { number: 7, text: "Click Generate API Key and copy it immediately" },
      { number: 8, text: "Also copy the Application ID on the same page" },
    ],
    fields: [
      { key: "application_id", label: "Application ID", required: true, placeholder: "Your Zenoti Application ID" },
      { key: "api_key", label: "API Key", required: true, placeholder: "Your generated Zenoti API Key" },
    ],
    note: "Can\u2019t find the Apps page? Your admin role may need \u201CManage API Keys\u201D and \u201CManage Apps\u201D permissions.",
  },
  Acuity: {
    prerequisites: "API access requires Acuity\u2019s Premium plan ($49+/mo).",
    steps: [
      { number: 1, text: "Log into Acuity Scheduling (acuityscheduling.com)" },
      { number: 2, text: "In the left sidebar, scroll down to Business Settings" },
      { number: 3, text: "Click Integrations" },
      { number: 4, text: "Scroll down to the API section" },
      { number: 5, text: "Click View Credentials" },
      { number: 6, text: "Copy your User ID and API Key" },
    ],
    fields: [
      { key: "user_id", label: "User ID", required: true, placeholder: "Your numeric Acuity User ID" },
      { key: "api_key", label: "API Key", required: true, placeholder: "Your Acuity API Key" },
    ],
    note: "Don\u2019t see the API section? You may need to upgrade to the Premium plan.",
  },
};

const CONCIERGE_FALLBACK: Record<string, PlatformInstructions> = {
  Vagaro: { steps: [{ number: 1, text: "Go to Settings \u2192 Developers \u2192 APIs & Webhooks" }, { number: 2, text: "Copy your Client ID and Client Secret Key" }], fields: [{ key: "client_id", label: "Client ID", required: true, placeholder: "Your Vagaro Client ID" }, { key: "client_secret", label: "Client Secret Key", required: true, placeholder: "Your Vagaro Client Secret Key" }] },
  Mangomint: { steps: [{ number: 1, text: "Paste the credentials Mangomint\u2019s support team provided" }], fields: [{ key: "api_key", label: "API Key", required: true, placeholder: "Credentials from Mangomint" }] },
  AestheticsPro: { steps: [{ number: 1, text: "Paste the API credentials AestheticsPro provided" }], fields: [{ key: "api_key", label: "API Key", required: true, placeholder: "Credentials from AestheticsPro" }] },
};

function platformSlug(name: string): string { return name.toLowerCase().replace(/\s+/g, "_"); }

// ═══ Reusable Styles ═══
const card = "bg-white border border-[#e5e7eb] rounded-2xl p-7 shadow-sm";
const input = "w-full h-[52px] rounded-xl border border-[#e5e7eb] bg-white px-4 text-[15px] text-[#1f2937] placeholder:text-[#9ca3af] outline-none transition-all focus:border-[#c9a46c] focus:ring-[3px] focus:ring-[rgba(201,164,108,0.1)]";
const textarea = "w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-[15px] text-[#1f2937] placeholder:text-[#9ca3af] outline-none resize-none transition-all focus:border-[#c9a46c] focus:ring-[3px] focus:ring-[rgba(201,164,108,0.1)]";
const label = "block text-sm font-medium text-[#1f2937] mb-2";
const goldBtn = "w-full h-[56px] rounded-xl bg-[#c9a46c] text-white font-semibold text-[15px] shadow-sm hover:bg-[#d4b380] hover:shadow-md active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-none";
const ghostBtn = "h-[56px] rounded-xl border border-[#e5e7eb] bg-white text-[#1f2937] font-medium text-[15px] hover:bg-[#f9fafb] hover:border-[#d1d5db] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer px-6";

type WizardStep = 1 | 2 | 3;
type PostStep = "connect" | "concierge" | "help" | "done";

// ═══ Shared Components ═══
function Header() {
  return (
    <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-[#e5e7eb]">
      <div className="max-w-[640px] mx-auto px-6 py-4 flex items-center justify-between">
        <span className="text-sm font-bold tracking-[0.18em] text-[#1f2937]">
          VELOS<span className="text-[#c9a46c]">LUXE</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
          <Shield size={13} /> 256-bit encrypted
        </span>
      </div>
    </div>
  );
}

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="max-w-[640px] mx-auto px-6 pt-6 pb-1">
      <div className="flex justify-between mb-2">
        <span className="text-xs font-semibold tracking-wider uppercase text-[#c9a46c]">Step {step} of {total}</span>
        <span className="text-xs text-[#9ca3af]">{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="h-1 bg-[#f3f4f6] rounded-full overflow-hidden">
        <div className="h-full bg-[#c9a46c] rounded-full transition-all duration-500 ease-out" style={{ width: `${(step / total) * 100}%` }} />
      </div>
    </div>
  );
}

function Badges() {
  return (
    <div className="flex flex-wrap justify-center gap-5 mt-8 pt-6 border-t border-[#f3f4f6]">
      {[
        { icon: <Zap size={14} className="text-[#c9a46c]" />, t: "Live in 48 hours" },
        { icon: <Star size={14} className="text-[#c9a46c]" />, t: "50+ med spas" },
        { icon: <MessageSquare size={14} className="text-[#059669]" />, t: "Dedicated support" },
      ].map((b, i) => (
        <span key={i} className="flex items-center gap-1.5 text-xs text-[#9ca3af]">{b.icon} {b.t}</span>
      ))}
    </div>
  );
}

// ═══ Main ═══
export default function OnboardingForm() {
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [postStep, setPostStep] = useState<PostStep | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [oauthConnected, setOauthConnected] = useState(false);
  const [apiKeyFields, setApiKeyFields] = useState<Record<string, string>>({});
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [customService, setCustomService] = useState("");
  const [form, setForm] = useState({
    spa_name: "", contact_name: "", contact_email: "", contact_phone: "",
    website: "", services: "", current_platform: "", num_locations: "1",
    referral_source: "", notes: "",
  });

  useEffect(() => {
    const handler = (e: MessageEvent) => { if (e.data?.type === "oauth_connected") setOauthConnected(true); };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const update = useCallback((f: string, v: string) => setForm(p => ({ ...p, [f]: v })), []);

  function toggleService(s: string) {
    setSelectedServices(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      setForm(f => ({ ...f, services: [...next].join(", ") }));
      return next;
    });
  }
  function addCustomService() {
    const t = customService.trim();
    if (t && !selectedServices.has(t)) {
      setSelectedServices(prev => { const n = new Set(prev); n.add(t); setForm(f => ({ ...f, services: [...n].join(", ") })); return n; });
      setCustomService("");
    }
  }
  function goTo(s: WizardStep) { setWizardStep(s); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function handleOAuthConnect() {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { setSubmissionId(data.id); window.open(`/api/onboarding/oauth/${platformSlug(form.current_platform)}/authorize?submission_id=${data.id}`, "oauth_popup", "width=600,height=700"); }
      else setError(data.error || "Something went wrong");
    } catch { setError("Network error"); }
    setLoading(false);
  }

  async function handleSubmit() {
    setError(""); setLoading(true);
    try {
      if (submissionId) { setPostStep("done"); }
      else {
        const res = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const data = await res.json();
        if (data.success) { setSubmissionId(data.id); setPostStep(CONCIERGE_PLATFORMS.includes(form.current_platform) ? "concierge" : API_KEY_PLATFORMS.includes(form.current_platform) ? "connect" : "done"); }
        else setError(data.error || "Something went wrong");
      }
    } catch { setError("Network error"); }
    setLoading(false);
  }

  async function handleApiKeySubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch(`/api/onboarding/${submissionId}/connect`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(apiKeyFields) });
      if (res.ok) setPostStep("done"); else setError("Failed to submit");
    } catch { setError("Network error"); }
    setLoading(false);
  }

  const instructions = API_KEY_INSTRUCTIONS[form.current_platform] || CONCIERGE_FALLBACK[form.current_platform];
  const conciergeInfo = CONCIERGE_INFO[form.current_platform];
  const ok1 = form.spa_name.trim() !== "" && form.contact_name.trim() !== "";
  const ok2 = form.current_platform !== "";

  // ─── Concierge ───
  if (postStep === "concierge" && conciergeInfo) return (
    <div className="min-h-screen bg-[#f9fafb]"><Header />
      <div className="max-w-[540px] mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#ecfdf5] flex items-center justify-center mx-auto mb-5"><CheckCircle size={32} className="text-[#059669]" /></div>
          <h2 className="text-2xl font-semibold text-[#1f2937] mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Thanks, <em className="text-[#c9a46c]">{form.contact_name.split(" ")[0]}</em>! One quick step.
          </h2>
          <p className="text-[#6b7280] leading-relaxed max-w-[440px] mx-auto">
            {form.current_platform} requires you to request API access from your account. It&apos;s quick &mdash; <strong className="text-[#1f2937]">then we handle everything else.</strong>
          </p>
        </div>
        <div className={card}>
          {/* The one thing they need to do */}
          <div className="p-5 rounded-xl bg-[rgba(201,164,108,.04)] border border-[rgba(201,164,108,.15)] mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#c9a46c] mb-3">Your one step</p>
            <p className="text-[15px] font-medium text-[#1f2937] mb-2">{conciergeInfo.action}</p>
            <p className="text-sm text-[#6b7280] leading-relaxed">{conciergeInfo.speedUpTip}</p>

            {/* Copy-paste message for Mangomint/AestheticsPro */}
            {conciergeInfo.copyText && (
              <div className="mt-4 p-3 rounded-lg bg-white border border-[#e5e7eb]">
                <p className="text-xs font-semibold text-[#9ca3af] mb-1.5">Copy &amp; paste this message:</p>
                <p className="text-sm text-[#1f2937] italic leading-relaxed">&ldquo;{conciergeInfo.copyText}&rdquo;</p>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(conciergeInfo.copyText!); }}
                  className="mt-2 text-xs font-medium text-[#c9a46c] hover:text-[#d4b380] cursor-pointer bg-transparent border-none transition-colors"
                >
                  Copy to clipboard
                </button>
              </div>
            )}
          </div>

          {/* What we do after */}
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af] mb-3">After that, we take over</p>
          <div className="space-y-2 mb-5">
            {[
              "Once " + form.current_platform + " provides credentials, forward them to us (or we\u2019ll grab them on a call)",
              "We configure Sophia and test everything end-to-end",
              "You get a text when your AI receptionist is live",
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[#f3f4f6] text-[#6b7280] text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                <span className="text-sm text-[#6b7280]">{t}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-4 p-4 rounded-xl bg-[#f9fafb] border border-[#e5e7eb]">
            <Clock size={18} className="text-[#9ca3af] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#1f2937]">Typical timeline: {conciergeInfo.timeline}</p>
              <p className="text-xs text-[#6b7280] mt-0.5">We&apos;ll text you at {form.contact_phone || "your phone"} when ready.</p>
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className={goldBtn + " no-underline"}>
            <Calendar size={18} /> Book a Setup Call &mdash; We&apos;ll Do It Together
          </a>
          <p className="text-center text-xs text-[#6b7280]">10-min screen share &mdash; we walk you through the request live</p>
          <button onClick={() => setPostStep("connect")} className="w-full text-center text-sm text-[#9ca3af] hover:text-[#c9a46c] transition-colors cursor-pointer bg-transparent border-none">I already have API credentials &rarr;</button>
        </div>
      </div>
    </div>
  );

  // ─── Help ───
  if (postStep === "help") return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-6"><div className={card + " max-w-[420px] text-center"}>
      <div className="w-16 h-16 rounded-2xl bg-[#f5f3ff] flex items-center justify-center mx-auto mb-5"><PhoneCall size={28} className="text-[#7c3aed]" /></div>
      <h2 className="text-xl font-semibold text-[#1f2937] mb-2">We&apos;ve got you!</h2>
      <p className="text-[#6b7280] mb-6 leading-relaxed">Our team will reach out shortly to help connect {form.current_platform}.</p>
      <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className={goldBtn + " no-underline w-auto inline-flex px-8 mx-auto mb-4"}><Calendar size={16} /> Book a Setup Call</a>
      <p className="text-xs text-[#9ca3af] mb-3">Or reach us directly:</p>
      <div className="flex gap-3 justify-center flex-wrap">
        <a href="tel:+17403018119" className={ghostBtn + " no-underline h-11 text-sm"}><PhoneCall size={14} /> (740) 301-8119</a>
        <a href="mailto:hello@velosluxe.com" className={ghostBtn + " no-underline h-11 text-sm"}>Email Us</a>
      </div>
    </div></div>
  );

  // ─── Done ───
  if (postStep === "done") return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-6"><div className={card + " max-w-[460px] text-center"}>
      <div className="w-16 h-16 rounded-2xl bg-[#ecfdf5] flex items-center justify-center mx-auto mb-5"><CheckCircle size={32} className="text-[#059669]" /></div>
      <h2 className="text-2xl font-semibold text-[#1f2937] mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Welcome to <em className="text-[#c9a46c]">VelosLuxe</em></h2>
      <p className="text-[#6b7280] mb-6 leading-relaxed">We&apos;re setting up Sophia, your AI receptionist. Our team will reach out within 24 hours.</p>
      <div className="text-left bg-[#f9fafb] rounded-xl p-5 mb-6 space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">What happens next</p>
        {["Confirmation email on its way", "A team member finalizes your setup", "We test Sophia with a live call before launch"].map((t, i) => (
          <div key={i} className="flex items-center gap-2.5"><CheckCircle size={16} className="text-[#059669] shrink-0" /><span className="text-sm text-[#6b7280]">{t}</span></div>
        ))}
      </div>
      <p className="text-xs text-[#9ca3af]">Questions? <a href="mailto:hello@velosluxe.com" className="text-[#c9a46c] hover:underline">hello@velosluxe.com</a> &middot; <a href="tel:+17403018119" className="text-[#c9a46c] hover:underline">(740) 301-8119</a></p>
    </div></div>
  );

  // ─── Connect (API Key) ───
  if (postStep === "connect" && instructions) return (
    <div className="min-h-screen bg-[#f9fafb]"><Header />
      <div className="max-w-[540px] mx-auto px-6 py-10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#f5f3ff] flex items-center justify-center mx-auto mb-4"><Key size={24} className="text-[#7c3aed]" /></div>
          <h2 className="text-xl font-semibold text-[#1f2937]">Connect {form.current_platform}</h2>
          <p className="text-sm text-[#6b7280]">Follow these steps, then paste your credentials below.</p>
        </div>
        <div className={card + " space-y-5"}>
          {instructions.prerequisites && (
            <div className="p-4 rounded-xl bg-[#fffbeb] border border-[#fde68a]">
              <p className="text-xs font-semibold text-[#92400e] mb-1">Before you start</p>
              <p className="text-sm text-[#92400e]/80 leading-relaxed">{instructions.prerequisites}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af] mb-3">Instructions</p>
            <ol className="space-y-2">
              {instructions.steps.map(s => (
                <li key={s.number} className="flex gap-3 items-start">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[rgba(201,164,108,.1)] text-[#c9a46c] text-[11px] font-bold flex items-center justify-center mt-0.5">{s.number}</span>
                  <span className="text-sm text-[#6b7280] leading-relaxed">{s.text}</span>
                </li>
              ))}
            </ol>
          </div>
          {instructions.note && <p className="text-xs text-[#9ca3af] leading-relaxed bg-[#f9fafb] rounded-xl p-3">{instructions.note}</p>}
          <form onSubmit={handleApiKeySubmit} className="space-y-4 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">Paste your credentials</p>
            {instructions.fields.map(f => (
              <div key={f.key}>
                <label className={label}>{f.label} {f.required && <span className="text-[#dc2626]">*</span>}</label>
                <input required={f.required} value={apiKeyFields[f.key] || ""} onChange={e => setApiKeyFields(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className={input + " font-mono"} />
              </div>
            ))}
            {error && <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-3 text-sm text-[#dc2626]">{error}</div>}
            <button type="submit" disabled={loading} className={goldBtn + (loading ? " opacity-60" : "")}>
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Connect & Finish <ArrowRight size={18} /></>}
            </button>
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer"
              onClick={async () => { try { await fetch(`/api/onboarding/${submissionId}/help`, { method: "POST", headers: { "Content-Type": "application/json" } }); } catch {} }}
              className="w-full flex items-center justify-center gap-2 text-sm text-[#c9a46c] hover:text-[#d4b380] font-medium transition-colors no-underline">
              <Calendar size={14} /> Need help? Book a setup call
            </a>
          </form>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════
  // WIZARD
  // ═══════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <Header />
      <Progress step={wizardStep} total={3} />

      <div className="max-w-[560px] mx-auto px-6 pb-12">

        {/* ── Step 1 ── */}
        {wizardStep === 1 && (<div>
          <div className="mt-8 mb-6 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[rgba(201,164,108,.08)] border border-[rgba(201,164,108,.15)] flex items-center justify-center">
              <Building2 size={20} className="text-[#c9a46c]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#1f2937]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Tell us about your spa</h2>
              <p className="text-sm text-[#6b7280]">We&apos;ll customize Sophia to match your brand.</p>
            </div>
          </div>

          <div className={card + " space-y-5"}>
            <div>
              <label className={label}>Business Name <span className="text-[#dc2626]">*</span></label>
              <input value={form.spa_name} onChange={e => update("spa_name", e.target.value)} placeholder="Glow Med Spa" className={input} />
            </div>
            <div>
              <label className={label}>Your Name <span className="text-[#dc2626]">*</span></label>
              <input value={form.contact_name} onChange={e => update("contact_name", e.target.value)} placeholder="Jane Smith" className={input} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={label}>Email</label><input type="email" value={form.contact_email} onChange={e => update("contact_email", e.target.value)} placeholder="jane@glowspa.com" className={input} /></div>
              <div><label className={label}>Phone</label><input type="tel" value={form.contact_phone} onChange={e => update("contact_phone", e.target.value)} placeholder="(555) 123-4567" className={input} /></div>
            </div>
            <div><label className={label}>Website</label><input value={form.website} onChange={e => update("website", e.target.value)} placeholder="glowmedspa.com" className={input} /></div>
            {error && <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-3 text-sm text-[#dc2626]">{error}</div>}
          </div>

          <button onClick={() => { if (!ok1) { setError("Business name and your name are required."); return; } setError(""); goTo(2); }} className={goldBtn + " mt-6"}>
            Continue <ArrowRight size={18} />
          </button>
          <Badges />
        </div>)}

        {/* ── Step 2 ── */}
        {wizardStep === 2 && (<div>
          <div className="mt-8 mb-6 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#f5f3ff] border border-[#e9e5ff] flex items-center justify-center">
              <Plug size={20} className="text-[#7c3aed]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#1f2937]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Your booking platform</h2>
              <p className="text-sm text-[#6b7280]">We&apos;ll connect Sophia to your calendar.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PLATFORMS.map(p => {
              const meta = PLATFORM_META[p];
              const sel = form.current_platform === p;
              const tierColor = meta?.tier === "oauth" ? "text-[#059669] bg-[#ecfdf5] border-[#a7f3d0]" : meta?.tier === "concierge" ? "text-[#7c3aed] bg-[#f5f3ff] border-[#ddd6fe]" : meta?.tier === "api_key" ? "text-[#2563eb] bg-[#eff6ff] border-[#bfdbfe]" : "";
              const tierLabel = meta?.tier === "oauth" ? "Instant" : meta?.tier === "concierge" ? "We set up" : meta?.tier === "api_key" ? "Self-service" : null;
              return (
                <button key={p} type="button" onClick={() => update("current_platform", p)}
                  className={`relative text-left p-4 rounded-xl border-2 transition-all duration-150 cursor-pointer bg-white ${sel ? "border-[#c9a46c] shadow-md ring-2 ring-[rgba(201,164,108,0.1)]" : "border-[#e5e7eb] hover:border-[#d1d5db] hover:shadow-sm"}`}>
                  {sel && <CheckCircle size={18} className="absolute top-3 right-3 text-[#c9a46c]" />}
                  <p className="text-sm font-semibold text-[#1f2937]">{p}</p>
                  {meta && <p className="text-xs text-[#9ca3af] mt-0.5">{meta.description}</p>}
                  {tierLabel && <span className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tierColor}`}>{tierLabel}</span>}
                </button>
              );
            })}
          </div>

          {form.current_platform && form.current_platform !== "None" && form.current_platform !== "Other" && (
            <div className="mt-4">
              {OAUTH_PLATFORMS.includes(form.current_platform) ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0]">
                  <Zap size={18} className="text-[#059669] shrink-0" />
                  <p className="text-sm text-[#065f46]">{form.current_platform} connects in one click &mdash; no API keys needed.</p>
                </div>
              ) : CONCIERGE_PLATFORMS.includes(form.current_platform) ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#f5f3ff] border border-[#ddd6fe]">
                  <Shield size={18} className="text-[#7c3aed] shrink-0" />
                  <p className="text-sm text-[#5b21b6]"><strong>We&apos;ll walk you through {form.current_platform} setup</strong> &mdash; one quick step from you, then we do the rest.</p>
                </div>
              ) : API_KEY_PLATFORMS.includes(form.current_platform) ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#eff6ff] border border-[#bfdbfe]">
                  <Key size={18} className="text-[#2563eb] shrink-0" />
                  <p className="text-sm text-[#1e40af]">We&apos;ll walk you through getting your {form.current_platform} API key &mdash; about 2 minutes.</p>
                </div>
              ) : null}
            </div>
          )}

          {OAUTH_PLATFORMS.includes(form.current_platform) && (
            <div className="mt-4">
              {oauthConnected ? (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0]">
                  <CheckCircle size={20} className="text-[#059669]" />
                  <span className="text-sm font-semibold text-[#059669]">{form.current_platform} connected!</span>
                </div>
              ) : (
                <button type="button" onClick={handleOAuthConnect} disabled={loading || !ok1} className={ghostBtn + " w-full" + (loading || !ok1 ? " opacity-50" : "")}>
                  {loading ? <span className="w-4 h-4 border-2 border-[#d1d5db] border-t-[#1f2937] rounded-full animate-spin" /> : <>Connect {form.current_platform}</>}
                </button>
              )}
            </div>
          )}

          {error && <div className="mt-4 bg-[#fef2f2] border border-[#fecaca] rounded-xl p-3 text-sm text-[#dc2626]">{error}</div>}

          <div className="flex gap-3 mt-6">
            <button onClick={() => goTo(1)} className={ghostBtn}><ArrowLeft size={16} /> Back</button>
            <button onClick={() => { if (!ok2) { setError("Please select your booking platform."); return; } setError(""); goTo(3); }} className={goldBtn + " flex-1"}>Continue <ArrowRight size={18} /></button>
          </div>
        </div>)}

        {/* ── Step 3 ── */}
        {wizardStep === 3 && (<div>
          <div className="mt-8 mb-6 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center">
              <User size={20} className="text-[#059669]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#1f2937]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Almost there!</h2>
              <p className="text-sm text-[#6b7280]">A few details so Sophia knows your treatments.</p>
            </div>
          </div>

          <div className={card + " space-y-5"}>
            {/* Services */}
            <div>
              <label className={label}>Services you offer</label>
              <p className="text-xs text-[#9ca3af] mb-3">Tap to select. Sophia uses these to answer patient questions.</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_SERVICES.map(s => (
                  <button key={s} type="button" onClick={() => toggleService(s)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 cursor-pointer ${selectedServices.has(s) ? "bg-[rgba(201,164,108,.08)] border-[#c9a46c] text-[#92400e]" : "bg-white border-[#e5e7eb] text-[#6b7280] hover:border-[#d1d5db]"}`}>
                    {selectedServices.has(s) && <span className="mr-1">&#10003;</span>}{s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={customService} onChange={e => setCustomService(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomService(); } }}
                  placeholder="Add a custom service..." className={input + " h-10 rounded-lg flex-1"} />
                <button type="button" onClick={addCustomService} className="h-10 px-4 rounded-lg border border-[#e5e7eb] bg-white text-[#6b7280] text-sm font-medium hover:bg-[#f9fafb] transition-colors cursor-pointer">Add</button>
              </div>
              {[...selectedServices].filter(s => !PRESET_SERVICES.includes(s)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {[...selectedServices].filter(s => !PRESET_SERVICES.includes(s)).map(s => (
                    <button key={s} type="button" onClick={() => toggleService(s)} className="px-3.5 py-1.5 rounded-full text-sm font-medium bg-[#f5f3ff] border border-[#ddd6fe] text-[#7c3aed] cursor-pointer">&#10003; {s} &times;</button>
                  ))}
                </div>
              )}
            </div>

            {/* Locations */}
            <div>
              <label className={label}>Locations</label>
              <input type="number" min="1" value={form.num_locations} onChange={e => update("num_locations", e.target.value)} className={input + " max-w-[120px]"} />
            </div>

            {/* Referral */}
            <div>
              <label className={label}>How did you find us?</label>
              <div className="flex flex-wrap gap-2">
                {["Google", "Instagram", "Facebook", "Referral", "Trade Show", "Other"].map(src => (
                  <button key={src} type="button" onClick={() => update("referral_source", form.referral_source === src ? "" : src)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 cursor-pointer ${form.referral_source === src ? "bg-[rgba(201,164,108,.08)] border-[#c9a46c] text-[#92400e]" : "bg-white border-[#e5e7eb] text-[#6b7280] hover:border-[#d1d5db]"}`}>
                    {form.referral_source === src && <span className="mr-1">&#10003;</span>}{src}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={label}>Anything else? <span className="text-[#9ca3af] font-normal">(optional)</span></label>
              <textarea value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Business hours, special requests..." rows={2} className={textarea} />
            </div>

            {/* Summary */}
            <div className="bg-[#f9fafb] rounded-xl p-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af] mb-2">Summary</p>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <span className="text-[#9ca3af]">Business</span><span className="font-medium text-[#1f2937]">{form.spa_name}</span>
                <span className="text-[#9ca3af]">Contact</span><span className="font-medium text-[#1f2937]">{form.contact_name}</span>
                <span className="text-[#9ca3af]">Platform</span><span className="font-medium text-[#1f2937]">{form.current_platform}</span>
                {selectedServices.size > 0 && <><span className="text-[#9ca3af]">Services</span><span className="font-medium text-[#1f2937]">{selectedServices.size} selected</span></>}
              </div>
            </div>

            {error && <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-3 text-sm text-[#dc2626]">{error}</div>}
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => goTo(2)} className={ghostBtn}><ArrowLeft size={16} /> Back</button>
            <button onClick={handleSubmit} disabled={loading} className={goldBtn + " flex-1" + (loading ? " opacity-60" : "")}>
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Get Started <Sparkles size={18} /></>}
            </button>
          </div>
          <p className="text-center text-xs text-[#9ca3af] mt-4">By submitting, you agree to be contacted about VelosLuxe services.</p>
        </div>)}
      </div>
    </div>
  );
}
