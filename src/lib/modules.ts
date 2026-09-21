import type { LucideIcon } from "lucide-react";
import {
  Home,
  BookOpen,
  Wrench,
  BarChart3,
  Zap,
  ShieldCheck,
} from "lucide-react";

export type ModuleKey =
  | "home"
  | "knowledge"
  | "facilities"
  | "executive"
  | "incidents"
  | "security";

export type ModuleDef = {
  key: ModuleKey;
  label: string;
  short: string;
  href: string;
  icon: LucideIcon;
  reuses: string;
  description: string;
};

export const MODULES: ModuleDef[] = [
  {
    key: "home",
    label: "Home Portal",
    short: "Home",
    href: "/",
    icon: Home,
    reuses: "AI Squad portal",
    description: "Role-based launchpad, live alerts, KPI snapshot",
  },
  {
    key: "knowledge",
    label: "Knowledge Assistant",
    short: "Knowledge",
    href: "/knowledge",
    icon: BookOpen,
    reuses: "OIP document intelligence",
    description: "Grounded Q&A over SOPs, manuals & policies",
  },
  {
    key: "facilities",
    label: "Facilities Intelligence",
    short: "Facilities",
    href: "/facilities",
    icon: Wrench,
    reuses: "Dashboard capability + sensor ingestion",
    description: "Asset health, telemetry & predictive alerts",
  },
  {
    key: "executive",
    label: "Executive Dashboard",
    short: "Executive",
    href: "/executive",
    icon: BarChart3,
    reuses: "Dashboard capability",
    description: "Natural-language analytics & leadership summaries",
  },
  {
    key: "incidents",
    label: "Incident & Workflow",
    short: "Incidents",
    href: "/incidents",
    icon: Zap,
    reuses: "Agent Builder + ProcureChain",
    description: "Alert-to-resolution orchestration",
  },
  {
    key: "security",
    label: "Security & Governance",
    short: "Security",
    href: "/security",
    icon: ShieldCheck,
    reuses: "AI Squad portal governance",
    description: "Access control, RBAC & audit trail",
  },
];
