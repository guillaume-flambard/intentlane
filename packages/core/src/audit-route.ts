import type { AuditProject } from "./audit-project.js";
import type { AuditConfidence, AuditEvidence } from "./audit.js";

export const AUDIT_ROUTES = ["native", "bridged", "ineligible", "unknown"] as const;

export type AuditRoute = (typeof AUDIT_ROUTES)[number];

export type AuditRouteReport = Readonly<{
  route: AuditRoute;
  confidence: AuditConfidence;
  evidence: readonly AuditEvidence[];
  nextAction: string;
}>;

const BRIDGE_MARKERS: readonly string[] = [
  "Podfile",
  "app.json",
  "app.config.js",
  "app.config.ts",
  "capacitor.config.json",
  "capacitor.config.ts",
  "pubspec.yaml",
  "tauri.conf.json"
];

const WEB_MARKERS: readonly string[] = [
  "package.json",
  "index.html",
  "next.config.js",
  "next.config.ts",
  "vite.config.js",
  "vite.config.ts"
];

const WEB_EXTENSIONS: readonly string[] = [".html", ".js", ".jsx", ".ts", ".tsx"];

function basename(file: string): string {
  const index = file.lastIndexOf("/");
  return index === -1 ? file : file.slice(index + 1);
}

function isNativeTarget(file: string): boolean {
  return file.includes(".xcodeproj/") || file.includes(".xcworkspace/") || file === "Package.swift";
}

function evidence(paths: readonly string[], kind: AuditEvidence["kind"]): AuditEvidence[] {
  return paths.map((path) => ({ kind, path }));
}

export function detectIntegrationRoute(
  files: readonly string[],
  projects: readonly AuditProject[] = []
): AuditRouteReport {
  const targets = files.filter(isNativeTarget);
  const bridges = files.filter((file) => BRIDGE_MARKERS.includes(basename(file)));

  if (targets.length > 0 && bridges.length === 0) {
    return {
      route: "native",
      confidence: "high",
      evidence: evidence(targets, "project"),
      nextAction: "Keep the generated Swift in the native target and check the extracted metadata."
    };
  }

  if (targets.length > 0) {
    return {
      route: "bridged",
      confidence: "high",
      evidence: [...evidence(targets, "project"), ...evidence(bridges, "config")],
      nextAction: "Keep the generated Swift in the native target the cross-platform build produces."
    };
  }

  if (bridges.length > 0) {
    return {
      route: "bridged",
      confidence: "medium",
      evidence: evidence(bridges, "config"),
      nextAction: "Run a native build so the cross-platform framework produces the target that carries the Swift."
    };
  }

  const swift = files.filter((file) => file.endsWith(".swift"));
  if (swift.length > 0 || projects.length > 0) {
    return {
      route: "native",
      confidence: "medium",
      evidence: evidence(swift, "swift"),
      nextAction: "Add the Swift to a native target before relying on the App Intents metadata."
    };
  }

  const web = files.filter(
    (file) => WEB_MARKERS.includes(basename(file)) || WEB_EXTENSIONS.some((extension) => file.endsWith(extension))
  );
  if (web.length > 0) {
    return {
      route: "ineligible",
      confidence: "high",
      evidence: evidence(web, "config"),
      nextAction: "A web-only project carries App Intents only through a native target or a bridge."
    };
  }

  return {
    route: "unknown",
    confidence: files.length > 0 ? "medium" : "low",
    evidence: [],
    nextAction: "No native target, no bridge and no web source were recognized here."
  };
}
