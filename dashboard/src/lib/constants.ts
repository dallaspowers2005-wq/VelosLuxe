import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Plug,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Onboarding", href: "/dashboard/onboarding", icon: ClipboardList },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug },
];

export const ONBOARDING_STATUSES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "contacted", label: "Contacted", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { value: "in_progress", label: "In Progress", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "provisioned", label: "Provisioned", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "declined", label: "Declined", color: "bg-red-100 text-red-700 border-red-200" },
];

export const CONCIERGE_STATUSES = [
  { value: "pending", label: "Pending", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "request_sent", label: "Request Sent", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "waiting_approval", label: "Waiting Approval", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "credentials_received", label: "Credentials Received", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { value: "connected", label: "Connected", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
];

export const CONCIERGE_PLATFORMS = ["Vagaro", "Mangomint", "AestheticsPro"];

export const CALENDLY_URL = "https://calendly.com/velosluxe/setup";

export const PLATFORMS = [
  "Vagaro", "Boulevard", "Mangomint", "AestheticsPro",
  "Zenoti", "Google Calendar", "Acuity", "Square", "Other", "None"
];
