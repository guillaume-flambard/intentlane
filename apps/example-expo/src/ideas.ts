export type IdeaPriority = "low" | "medium" | "high";

export type Idea = Readonly<{
  id: string;
  title: string;
  effort: number;
  due?: string;
  priority: IdeaPriority;
  status: "open" | "done";
}>;

const PRIORITIES: readonly IdeaPriority[] = ["low", "medium", "high"];

export function isPriority(value: string | undefined): value is IdeaPriority {
  return value !== undefined && PRIORITIES.some((priority) => priority === value);
}

export function nextIdeaId(ideas: readonly Idea[]): string {
  const numbers = ideas
    .map((idea) => Number.parseInt(idea.id.replace(/^idea-/, ""), 10))
    .filter((value) => Number.isFinite(value));
  const next = numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
  return `idea-${next}`;
}

export function ideaFromQuery(query: Readonly<Record<string, string>>, id: string): Idea {
  const title = (query.title ?? "").trim();
  const effort = Number.parseInt(query.effort ?? "", 10);
  const due = query.due ?? "";
  return {
    id,
    title: title.length > 0 ? title : "Untitled idea",
    effort: Number.isFinite(effort) ? effort : 1,
    ...(due.length > 0 ? { due } : {}),
    priority: isPriority(query.priority) ? query.priority : "medium",
    status: "open"
  };
}

export function seedIdeas(): readonly Idea[] {
  return [
    { id: "idea-1", title: "Ship the IntentLane pilot", effort: 5, due: "2026-10-01", priority: "high", status: "open" },
    { id: "idea-2", title: "Write the Kollio-like example", effort: 3, priority: "medium", status: "open" },
    { id: "idea-3", title: "Tune the Siri phrases", effort: 2, due: "2026-09-30", priority: "low", status: "open" }
  ];
}
