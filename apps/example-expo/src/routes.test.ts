import { describe, expect, it } from "vitest";
import { applyUrl, initialState } from "./router";
import { parseIntentLaneUrl } from "./routes";

describe("parseIntentLaneUrl", () => {
  it("reads the hostless form the generated Swift actually produces", () => {
    expect(parseIntentLaneUrl("intentlaneexample:/ideas/new?effort=2&priority=high&title=Hello%20world")).toEqual({
      segments: ["ideas", "new"],
      query: { effort: "2", priority: "high", title: "Hello world" }
    });
  });

  it("tolerates the trailing question mark of an empty query", () => {
    expect(parseIntentLaneUrl("intentlaneexample:/inbox?")).toEqual({ segments: ["inbox"], query: {} });
  });

  it("reads the double slash form", () => {
    expect(parseIntentLaneUrl("intentlaneexample://ideas?idea=a1")).toEqual({
      segments: ["ideas"],
      query: { idea: "a1" }
    });
  });

  it("decodes plus signs and skips empty pairs", () => {
    expect(parseIntentLaneUrl("kollio:/ideas/new?title=two+words&&effort=3")).toEqual({
      segments: ["ideas", "new"],
      query: { title: "two words", effort: "3" }
    });
  });

  it("keeps a malformed escape instead of throwing", () => {
    expect(parseIntentLaneUrl("kollio:/ideas/new?title=%zz")).toEqual({
      segments: ["ideas", "new"],
      query: { title: "%zz" }
    });
  });

  it("rejects a string without a scheme", () => {
    expect(parseIntentLaneUrl("/ideas/new")).toBeUndefined();
  });
});

describe("applyUrl", () => {
  it("creates an idea from a create route", () => {
    const state = applyUrl(
      initialState(),
      "intentlaneexample:/ideas/new?title=Ship%20it&effort=5&priority=high&due=2026-10-01"
    );
    expect(state.ideas).toHaveLength(4);
    expect(state.ideas[0]).toEqual({
      id: "idea-4",
      title: "Ship it",
      effort: 5,
      due: "2026-10-01",
      priority: "high",
      status: "open"
    });
    expect(state.selected).toBe("idea-4");
  });

  it("falls back to a safe idea when the query carries nothing useful", () => {
    const state = applyUrl(initialState(), "intentlaneexample:/ideas/new?");
    expect(state.ideas[0]?.title).toBe("Untitled idea");
    expect(state.ideas[0]?.priority).toBe("medium");
    expect(state.ideas[0]?.effort).toBe(1);
  });

  it("deletes the idea named in the query", () => {
    const state = applyUrl(initialState(), "intentlaneexample:/ideas/delete?idea=idea-2");
    expect(state.ideas.map((idea) => idea.id)).toEqual(["idea-1", "idea-3"]);
    expect(state.selected).toBeUndefined();
  });

  it("selects an existing idea", () => {
    const state = applyUrl(initialState(), "intentlaneexample:/ideas?idea=idea-3");
    expect(state.selected).toBe("idea-3");
    expect(state.message).toContain("Tune the Siri phrases");
  });

  it("reports an unknown idea without changing the list", () => {
    const state = applyUrl(initialState(), "intentlaneexample:/ideas?idea=idea-99");
    expect(state.selected).toBeUndefined();
    expect(state.message).toContain("idea-99");
  });

  it("counts the inbox", () => {
    expect(applyUrl(initialState(), "intentlaneexample:/inbox?").message).toBe("Inbox with 3 idea(s)");
  });

  it("keeps the list when the url cannot be parsed", () => {
    const before = initialState();
    const after = applyUrl(before, "not a url");
    expect(after.ideas).toEqual(before.ideas);
    expect(after.message).toContain("not a url");
  });

  it("reports a route the example does not handle", () => {
    expect(applyUrl(initialState(), "intentlaneexample:/settings").message).toContain("/settings");
  });
});
