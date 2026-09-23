// Bundled data layer — files are the database; the dashboard is read-only.
import agentsJson from "@/data/agents.json";
import flowsJson from "@/data/flows.json";
import skillsJson from "@/data/skills.json";
import cronsJson from "@/data/crons.json";
import generationsJson from "@/data/generations.json";
import linksJson from "@/data/links.json";
import memoryJson from "@/data/memory.json";
import sprintsRaw from "@/data/sprints.md?raw";
import eventsRaw from "@/data/events.jsonl?raw";
import docGettingStarted from "@/data/docs/getting-started.md?raw";
import docArms from "@/data/docs/arms-framework.md?raw";
import docContracts from "@/data/docs/panel-contracts.md?raw";
import type {
  AgentsFile, CronsFile, FlowsFile, GenerationsFile, LinksFile,
  MemoryFile, SkillsFile, AuditEvent, SprintBoard, SprintTask,
} from "@/types/data";

export const agentsData = agentsJson as AgentsFile;
export const flowsData = flowsJson as FlowsFile;
export const skillsData = skillsJson as SkillsFile;
export const cronsData = cronsJson as CronsFile;
export const generationsData = generationsJson as GenerationsFile;
export const linksData = linksJson as LinksFile;
export const memoryData = memoryJson as MemoryFile;

/** events.jsonl — one JSON object per line, append-only. */
export const auditEvents: AuditEvent[] = eventsRaw
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => JSON.parse(l) as AuditEvent);

/** Docs — "the same files your agents load as context." */
export interface DocEntry {
  slug: string;
  title: string;
  body: string;
}
function titleOf(md: string, fallback: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : fallback;
}
export const docs: DocEntry[] = [
  { slug: "getting-started", title: titleOf(docGettingStarted, "Getting started"), body: docGettingStarted },
  { slug: "arms-framework", title: titleOf(docArms, "ARMS framework"), body: docArms },
  { slug: "panel-contracts", title: titleOf(docContracts, "Panel contracts"), body: docContracts },
];

/** sprints.md — markdown because humans edit it by hand most often. */
function parseTask(line: string): SprintTask | null {
  const m = line.match(/^- \[( |x)\]\s+(.*)$/);
  if (!m) return null;
  let text = m[2].trim();
  let owner: string | null = null;
  const own = text.match(/`\(([^)]+)\)`\s*$/);
  if (own) {
    owner = own[1];
    text = text.slice(0, own.index).trim();
  }
  return { text, owner, done: m[1] === "x" };
}
function parseSprints(md: string): SprintBoard {
  const lines = md.split(/\r?\n/);
  const board: SprintBoard = { title: "Sprints", note: "", inProgress: [], backlog: [], done: [] };
  let section: "none" | "inProgress" | "backlog" | "done" = "none";
  const noteLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("# ")) { board.title = line.slice(2).trim(); continue; }
    if (/^##\s+In Progress/i.test(line)) { section = "inProgress"; continue; }
    if (/^##\s+Backlog/i.test(line)) { section = "backlog"; continue; }
    if (/^##\s+Done/i.test(line)) { section = "done"; continue; }
    const task = parseTask(line.trim());
    if (task && section !== "none") { board[section].push(task); continue; }
    if (section === "none" && line.trim()) noteLines.push(line.trim());
  }
  board.note = noteLines.join(" ");
  return board;
}
export const sprints = parseSprints(sprintsRaw);

export const agentById = new Map(agentsData.agents.map((a) => [a.id, a]));
