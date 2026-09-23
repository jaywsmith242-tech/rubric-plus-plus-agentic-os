import {
  BookOpen, Brain, Clock, Columns3, Images, LayoutDashboard,
  Link2, Network, Users, Workflow, type LucideIcon,
} from "lucide-react";
import {
  agentsData, cronsData, docs, flowsData, generationsData,
  linksData, memoryData, skillsData, sprints,
} from "@/lib/data";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  section: "Observe" | "Operate" | "Explore";
}

const sprintOpen = sprints.inProgress.length + sprints.backlog.length;

export const NAV: NavItem[] = [
  { path: "/", label: "Board", icon: LayoutDashboard, section: "Observe" },
  { path: "/agents", label: "Agents", icon: Users, count: agentsData.agents.filter((a) => a.status !== "offline").length, section: "Observe" },
  { path: "/flows", label: "Flows", icon: Workflow, count: flowsData.flows.length, section: "Observe" },
  { path: "/crons", label: "Crons", icon: Clock, count: cronsData.crons.filter((c) => c.enabled).length, section: "Observe" },
  { path: "/sprints", label: "Sprints", icon: Columns3, count: sprintOpen, section: "Operate" },
  { path: "/skills", label: "Skill Tree", icon: Network, count: skillsData.skills.length, section: "Operate" },
  { path: "/generations", label: "Generations", icon: Images, count: generationsData.generations.length, section: "Operate" },
  { path: "/docs", label: "Docs", icon: BookOpen, count: docs.length, section: "Explore" },
  { path: "/links", label: "Links", icon: Link2, count: linksData.links.length, section: "Explore" },
  { path: "/memory", label: "Memory Graph", icon: Brain, count: memoryData.nodes.length, section: "Explore" },
];

export function navForPath(pathname: string): NavItem {
  return NAV.find((n) => (n.path === "/" ? pathname === "/" : pathname.startsWith(n.path))) ?? NAV[0];
}
