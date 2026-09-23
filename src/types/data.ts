// Contractual schemas from data/docs/panel-contracts.md (prior-audit §2).
// Field names and enums must not change.

export type AgentStatus = "active" | "idle" | "running" | "offline";

export interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  status: AgentStatus;
  lastTask: string;
  lastActive: string; // ISO
}
export interface AgentsFile {
  version: number;
  updated: string;
  agents: Agent[];
}

export type StepStatus = "done" | "running" | "waiting" | "failed";

export interface FlowStep {
  id: string;
  label: string;
  agent: string; // agent id or "human"
}
export interface FlowEvent {
  step: string;
  status: StepStatus;
  ts: string;
  note?: string;
}
export interface FlowRun {
  id: string;
  started: string;
  events: FlowEvent[];
}
export interface Flow {
  id: string;
  name: string;
  trigger: string;
  steps: FlowStep[];
  runs: FlowRun[];
}
export interface FlowsFile {
  version: number;
  flows: Flow[];
}

export type SkillLevel = 1 | 2 | 3;

export interface Skill {
  id: string;
  name: string; // slash-style: /robo
  level: SkillLevel;
  description: string;
  path: string;
  refs: string[];
  triggers: string[];
}
export interface SkillsFile {
  version: number;
  skills: Skill[];
}

export interface Cron {
  id: string;
  name: string;
  schedule: string; // standard 5-field cron
  human: string;
  host: string; // "hermes (cloud)" | "local"
  agent: string;
  skill: string;
  enabled: boolean;
  lastRun: string;
  lastStatus: string; // done | waiting-review | failed (free text)
  artifact: string | null;
}
export interface CronsFile {
  version: number;
  crons: Cron[];
}

export type GenType = "image" | "video";

export interface Generation {
  id: string;
  type: GenType;
  prompt: string;
  model: string;
  skill: string;
  seed: number;
  ts: string;
  asset: string;
}
export interface GenerationsFile {
  version: number;
  generations: Generation[];
}

export interface Link {
  label: string;
  url: string;
  category: string;
  note: string;
}
export interface LinksFile {
  version: number;
  links: Link[];
}

export type MemoryNodeType = "router" | "skill" | "doc" | "data";

export interface MemoryNode {
  id: string;
  type: MemoryNodeType;
  label: string;
}
export interface MemoryFile {
  version: number;
  nodes: MemoryNode[];
  edges: [string, string][];
}

export interface AuditEvent {
  ts: string;
  actor: string;
  panel: string;
  action: string;
  payload: Record<string, unknown>;
}

export interface SprintTask {
  text: string;
  owner: string | null; // agent id from `(id)`
  done: boolean;
}
export interface SprintBoard {
  title: string;
  note: string;
  inProgress: SprintTask[];
  backlog: SprintTask[];
  done: SprintTask[];
}
