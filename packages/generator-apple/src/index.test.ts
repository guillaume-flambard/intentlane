import { describe, expect, it } from "vitest";
import { parseConfig } from "../../core/src/index.js";
import { generateSwift } from "./index.js";

const config = {
  schema: "0.1",
  app: { id: "dev.intentlane.example", name: "Example", url_scheme: "example", min_ios: "18.0", locales: ["en", "fr"] },
  intents: [{
    id: "create_idea",
    title: { en: "Create an idea", fr: "Créer une idée" },
    description: { en: "Add a new idea", fr: "Ajouter une nouvelle idée" },
    parameters: [{ id: "title", type: "string", required: true }],
    execution: { mode: "open_app", route: "/ideas/new", mapping: { title: "title" } },
    result: { dialog: { en: "Your idea is ready", fr: "Votre idée est prête" } },
    shortcuts: { phrases: { en: ["Create an idea in ${appName}"], fr: ["Créer une idée dans ${appName}"] } }
  }]
};

const multiIntentConfig = {
  ...config,
  intents: [
    config.intents[0],
    {
      id: "open_inbox",
      title: { en: "Open the inbox", fr: "Ouvrir la boîte de réception" },
      parameters: [],
      execution: { mode: "open_app", route: "/inbox" },
      shortcuts: { phrases: { en: ["Open the inbox in ${appName}"] } }
    }
  ]
};

describe("generateSwift", () => {
  it("matches the reference Swift snapshot", () => {
    const result = parseConfig(config);
    if (!result.ir) throw new Error("Fixture must parse");
    expect(generateSwift(result.ir)).toMatchSnapshot();
  });

  it("is byte-for-byte deterministic", () => {
    const result = parseConfig(config);
    if (!result.ir) throw new Error("Fixture must parse");
    expect(generateSwift(result.ir)).toBe(generateSwift(result.ir));
  });

  it("matches the multi-intent Swift snapshot", () => {
    const result = parseConfig(multiIntentConfig);
    if (!result.ir) throw new Error("Fixture must parse");
    expect(generateSwift(result.ir)).toMatchSnapshot();
  });

  it("separates AppShortcuts without commas inside the result builder", () => {
    const result = parseConfig(multiIntentConfig);
    if (!result.ir) throw new Error("Fixture must parse");
    const swift = generateSwift(result.ir);
    expect(swift.match(/^\s*AppShortcut\(/gm)).toHaveLength(2);
    expect(swift).not.toMatch(/\),\n\s*AppShortcut\(/);
    expect(swift).toMatch(/systemImageName: "sparkles"\)\n\s*AppShortcut\(/);
  });

  it("omits intents that declare no shortcut phrases for the default locale", () => {
    const result = parseConfig({
      ...config,
      intents: [
        config.intents[0],
        { id: "open_inbox", title: { en: "Open the inbox" }, parameters: [], execution: { mode: "open_app", route: "/inbox" } }
      ]
    });
    if (!result.ir) throw new Error("Fixture must parse");
    const swift = generateSwift(result.ir);
    expect(swift.match(/^\s*AppShortcut\(/gm)).toHaveLength(1);
    expect(swift).not.toContain("OpenInbox()");
  });

  it("emits no shortcuts provider when no intent declares phrases", () => {
    const result = parseConfig({
      ...config,
      intents: [{ id: "open_inbox", title: { en: "Open the inbox" }, parameters: [], execution: { mode: "open_app", route: "/inbox" } }]
    });
    if (!result.ir) throw new Error("Fixture must parse");
    expect(generateSwift(result.ir)).not.toContain("AppShortcutsProvider");
  });
});
