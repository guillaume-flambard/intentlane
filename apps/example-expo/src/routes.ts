export type IntentLaneRoute = Readonly<{
  segments: readonly string[];
  query: Readonly<Record<string, string>>;
}>;

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseIntentLaneUrl(url: string): IntentLaneRoute | undefined {
  const colon = url.indexOf(":");
  if (colon === -1) return undefined;

  const rest = url.slice(colon + 1).replace(/^\/+/, "");
  const mark = rest.indexOf("?");
  const path = mark === -1 ? rest : rest.slice(0, mark);
  const search = mark === -1 ? "" : rest.slice(mark + 1);

  const segments = path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map(decode);

  const query: Record<string, string> = {};
  for (const pair of search.split("&")) {
    if (pair.length === 0) continue;
    const equals = pair.indexOf("=");
    const key = equals === -1 ? pair : pair.slice(0, equals);
    const value = equals === -1 ? "" : pair.slice(equals + 1);
    query[decode(key)] = decode(value.replace(/\+/g, " "));
  }

  return { segments, query };
}

export function routePath(route: IntentLaneRoute): string {
  return `/${route.segments.join("/")}`;
}
