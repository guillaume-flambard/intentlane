import { ideaFromQuery, nextIdeaId, seedIdeas, type Idea } from "./ideas";
import { parseIntentLaneUrl, routePath, type IntentLaneRoute } from "./routes";

export type RouteEffect = Readonly<{
  ideas: readonly Idea[];
  selected?: string;
  message: string;
}>;

export function applyRoute(route: IntentLaneRoute, ideas: readonly Idea[]): RouteEffect {
  const [section, action] = route.segments;

  if (section === "ideas" && action === "new") {
    const idea = ideaFromQuery(route.query, nextIdeaId(ideas));
    return { ideas: [idea, ...ideas], selected: idea.id, message: `Created ${idea.title}` };
  }

  if (section === "ideas" && action === "delete") {
    const id = route.query.idea ?? "";
    const removed = ideas.find((idea) => idea.id === id);
    return {
      ideas: ideas.filter((idea) => idea.id !== id),
      message: removed ? `Deleted ${removed.title}` : `No idea matches ${id}`
    };
  }

  if (section === "ideas") {
    const id = route.query.idea ?? "";
    const found = ideas.find((idea) => idea.id === id);
    return found
      ? { ideas, selected: found.id, message: `Opened ${found.title}` }
      : { ideas, message: `No idea matches ${id}` };
  }

  if (section === "inbox") {
    return { ideas, message: `Inbox with ${ideas.length} idea(s)` };
  }

  return { ideas, message: `Unhandled route ${routePath(route)}` };
}

export type ExampleState = Readonly<{
  ideas: readonly Idea[];
  route: IntentLaneRoute | undefined;
  selected: string | undefined;
  message: string;
}>;

export function initialState(): ExampleState {
  return {
    ideas: seedIdeas(),
    route: undefined,
    selected: undefined,
    message: "Waiting for a route from Siri or the Shortcuts app"
  };
}

export function applyUrl(state: ExampleState, url: string): ExampleState {
  const parsed = parseIntentLaneUrl(url);
  if (!parsed) return { ...state, message: `Unparsable route ${url}` };
  const effect = applyRoute(parsed, state.ideas);
  return { ideas: effect.ideas, route: parsed, selected: effect.selected, message: effect.message };
}
