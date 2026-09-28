import { describe, expect, it } from "vitest";
import { parseConfig } from "../../core/src/index.js";
import { generateSwift } from "./index.js";

// The notes domain is the first domain whose contract owns a full entity
// property list. Every assertion here was checked against a real macOS 27 build
// whose Apple metadata processor accepted the generated output, so these strings
// are the shape that actually compiles, not a guess from the documentation.

const config = {
  schema: "0.1",
  app: {
    id: "dev.intentlane.notes",
    name: "Notes",
    url_scheme: "notes",
    min_ios: "27.0",
    locales: ["en", "fr"]
  },
  entities: [
    {
      id: "account",
      title: { en: "Account", fr: "Compte" },
      identifier: "id",
      display: { title: "name" },
      query: { mode: "static" },
      exposure: { rules: ["item_not_usable"] },
      schema: "notes.account"
    },
    {
      id: "folder",
      title: { en: "Folder", fr: "Dossier" },
      identifier: "id",
      display: { title: "name" },
      query: { mode: "static" },
      exposure: { rules: ["item_not_usable"] },
      schema: "notes.folder"
    },
    {
      id: "note",
      title: { en: "Note", fr: "Note" },
      identifier: "id",
      display: { title: "name", subtitle: "content" },
      query: { mode: "static" },
      exposure: { rules: ["item_not_usable"] },
      schema: "notes.note"
    }
  ],
  intents: [
    {
      id: "create_note",
      title: { en: "Create a note", fr: "Créer une note" },
      execution: { mode: "native", handler: "CreateNoteHandler" },
      schema: "notes.createNote"
    },
    {
      id: "append_to_note",
      title: { en: "Append to a note", fr: "Ajouter à une note" },
      execution: { mode: "native", handler: "AppendToNoteHandler" },
      schema: "notes.appendText",
      target: "note"
    },
    {
      id: "update_note",
      title: { en: "Update a note", fr: "Mettre à jour une note" },
      execution: { mode: "native", handler: "UpdateNoteHandler" },
      schema: "notes.updateNote",
      target: "note"
    }
  ]
};

function generated(): string {
  const result = parseConfig(config);
  expect(result.diagnostics).toEqual([]);
  if (!result.ir) throw new Error("The notes fixture must parse");
  return generateSwift(result.ir);
}

describe("notes domain, entities", () => {
  it("declares every schema property with the type of the Apple contract", () => {
    const source = generated();
    expect(source).toContain("@AppEntity(schema: .notes.note)");
    expect(source).toContain("var name: AttributedString\n");
    expect(source).toContain("var content: AttributedString?\n");
    expect(source).toContain("var attachments: [IntentFile]\n");
    expect(source).toContain("var isPinned: Bool\n");
    expect(source).toContain("var creationDate: Date?\n");
    expect(source).toContain("var modificationDate: Date?\n");
    expect(source).toContain("var folder: IntentLaneFolderEntity?\n");
  });

  it("writes the initializer by hand, because EntityProperty has no init(wrappedValue:)", () => {
    const source = generated();
    expect(source).toContain("init(id: String, name: AttributedString, content: AttributedString? = nil, attachments: [IntentFile]");
    expect(source).toContain("    self.attachments = attachments");
  });

  it("gives every optional property a nil default in the initializer", () => {
    const source = generated();
    expect(source).toContain("modificationDate: Date? = nil, folder: IntentLaneFolderEntity? = nil)");
  });

  it("resolves a self-referencing schema property to its own entity type", () => {
    const source = generated();
    expect(source).toContain("var parentFolder: IntentLaneFolderEntity?\n");
    expect(source).toContain("var account: IntentLaneAccountEntity?\n");
  });

  it("makes a schema entity that a schema names resolvable", () => {
    const source = generated();
    expect(source).toContain("struct IntentLaneNoteEntity: AppEntity, IndexedEntity");
    expect(source).toContain("struct IntentLaneNoteQuery: EntityQuery, EntityStringQuery");
    expect(source).toContain("func entities(matching string: String) async throws -> [IntentLaneNoteEntity]");
  });

  it("imports CoreSpotlight when a schema entity is indexed", () => {
    expect(generated()).toContain("import CoreSpotlight\n");
  });

  it("renders an AttributedString display through characters, which is the form that compiles", () => {
    const source = generated();
    expect(source).toContain("title: LocalizedStringResource(stringLiteral: String(name.characters))");
    expect(source).toContain("subtitle: content.map { LocalizedStringResource(stringLiteral: String($0.characters)) }");
  });

  it("renders a String display property without a conversion", () => {
    expect(generated()).toContain("title: LocalizedStringResource(stringLiteral: name)");
  });
});

describe("notes domain, intents", () => {
  it("gives a creating schema no target and its own parameters", () => {
    const source = generated();
    expect(source).toContain("@AppIntent(schema: .notes.createNote)");
    expect(source).toContain("var name: AttributedString\n");
    expect(source).toContain("var content: AttributedString?\n");
    expect(source).toContain("var isPinned: Bool\n");
    expect(source).toContain("var folder: IntentLaneFolderEntity?\n");
  });

  it("never declares a parameter summary under a schema, because the schema owns it", () => {
    const source = generated();
    const createNote = source.slice(source.indexOf("@AppIntent(schema: .notes.createNote)"));
    expect(createNote.slice(0, createNote.indexOf("func perform"))).not.toContain("parameterSummary");
  });

  it("gives a file parameter concrete UTType subtypes, never public.item", () => {
    expect(generated()).toContain("supportedContentTypes: [.plainText, .image]");
  });

  it("declares updateNote without a content parameter, because Apple has none", () => {
    const source = generated();
    const update = source.slice(source.indexOf("@AppIntent(schema: .notes.updateNote)"));
    const body = update.slice(0, update.indexOf("func perform"));
    expect(body).toContain("var target: IntentLaneNoteEntity\n");
    expect(body).toContain("var name: AttributedString?\n");
    expect(body).toContain("var isPinned: Bool?\n");
    expect(body).not.toContain("var content:");
  });

  it("returns the entity the schema dictates", () => {
    const source = generated();
    expect(source).toContain("some IntentResult & ProvidesDialog & ReturnsValue<IntentLaneNoteEntity>");
    expect(source).toContain("let value = try await handler.perform(");
  });

  it("passes the schema parameters to the handler with their optionality", () => {
    const source = generated();
    expect(source).toContain("func perform(name: AttributedString, content: AttributedString?, attachments: [IntentFile], isPinned: Bool, folder: IntentLaneFolderEntity?) async throws -> IntentLaneNoteEntity");
    expect(source).toContain("func perform(content: AttributedString, target: IntentLaneNoteEntity) async throws -> IntentLaneNoteEntity");
  });

  it("is byte-for-byte deterministic", () => {
    const result = parseConfig(config);
    if (!result.ir) throw new Error("The notes fixture must parse");
    expect(generateSwift(result.ir)).toBe(generateSwift(result.ir));
  });
});
