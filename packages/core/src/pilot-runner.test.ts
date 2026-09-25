import { describe, expect, it } from "vitest";
import {
  analyseDiscovery,
  applyAnalyse,
  applyPrepare,
  applyTest,
  evaluateTest,
  retargetJournal,
  applyImplement,
  evaluateImplement,
  planRun,
  startRunJournal,
  type PrepareResult
} from "./pilot-runner.js";
import { pilotRunJournalSchema, type PilotRunJournal } from "../../schema/src/index.js";
import { pilotRunSequence } from "./pilot-run.js";

const facts = { pilot: "iina", branch: "intentlane/pilot-playedmedia", commit: "43e4abcd" } as const;

function journalWith(steps: PilotRunJournal["steps"]): PilotRunJournal {
  return { schema: "pilot-run/1.0", ...facts, steps };
}

function passedPrepare(commit: string = facts.commit): PilotRunJournal["steps"][number] {
  return {
    id: "prepare",
    status: "pass",
    commit,
    attempts: 1,
    evidence: [{ kind: "build", command: "xcodebuild build", exitCode: 0, artifact: "IINA.app" }]
  };
}

const succeeded: PrepareResult = {
  status: "pass",
  exitCode: 0,
  signature: "",
  diagnostic: "** BUILD SUCCEEDED **",
  durationMs: 128_790,
  command: "xcodebuild build -project iina.xcodeproj",
  artifact: "IINA.app"
};

describe("starting a run", () => {
  it("records every step as pending, so a reader can see the whole shape before anything runs", () => {
    expect(startRunJournal(facts).steps.map((entry) => `${entry.id}:${entry.status}`)).toEqual([
      "prepare:pending",
      "analyse:pending",
      "implement:pending",
      "test:pending",
      "repair:pending",
      "demonstrate:pending",
      "deliver:pending"
    ]);
  });

  it("produces a journal the schema accepts, because a run that writes an invalid journal cannot be resumed", () => {
    expect(pilotRunJournalSchema.safeParse(startRunJournal(facts)).success).toBe(true);
  });

  it("plans to run every step, because nothing has been trusted yet", () => {
    expect(planRun(startRunJournal(facts)).steps).toEqual([
      "prepare",
      "analyse",
      "implement",
      "test",
      "repair",
      "demonstrate",
      "deliver"
    ]);
  });
});

describe("resuming a run", () => {
  it("starts at the step after the last one that passed at this commit", () => {
    const journal = journalWith([passedPrepare()]);
    expect(planRun(journal).steps[0]).toBe("analyse");
  });

  it("runs prepare again when it passed at another commit, because the code underneath it changed", () => {
    const journal = journalWith([passedPrepare("1111111")]);
    expect(planRun(journal).steps[0]).toBe("prepare");
  });

  it("plans nothing when every step passed at this commit, so a finished run is not redone", () => {
    const later = pilotRunSequence
      .filter((id) => id !== "prepare")
      .map((id) => ({
        id,
        status: "pass" as const,
        commit: facts.commit,
        attempts: 1,
        evidence: [{ kind: "command" as const, command: `run ${id}` }]
      }));
    expect(planRun(journalWith([passedPrepare(), ...later])).steps).toEqual([]);
  });

  it("re-runs a failed step rather than skipping past it, because a later pass would hide it", () => {
    const journal = journalWith([
      { id: "prepare", status: "fail", commit: facts.commit, attempts: 1, evidence: [], diagnostic: "error: no such module" }
    ]);
    expect(planRun(journal).steps[0]).toBe("prepare");
  });
});

describe("recording the build", () => {
  it("marks prepare passed and keeps the command and the artifact as evidence", () => {
    const journal = applyPrepare(startRunJournal(facts), succeeded);
    const prepare = journal.steps.find((entry) => entry.id === "prepare");
    expect(prepare?.status).toBe("pass");
    expect(prepare?.evidence).toEqual([
      {
        kind: "build",
        command: "xcodebuild build -project iina.xcodeproj",
        exitCode: 0,
        artifact: "IINA.app"
      }
    ]);
  });

  it("keeps the journal valid after a pass, because an invalid journal cannot be resumed", () => {
    expect(pilotRunJournalSchema.safeParse(applyPrepare(startRunJournal(facts), succeeded)).success).toBe(true);
  });

  it("records how long the build took, because the offer is priced in hours and this is the first number in that sum", () => {
    const journal = applyPrepare(startRunJournal(facts), succeeded);
    expect(journal.steps.find((entry) => entry.id === "prepare")?.durationMs).toBe(128_790);
  });

  it("records the first compiler error on a failure, so a person does not have to read the whole log", () => {
    const journal = applyPrepare(startRunJournal(facts), {
      ...succeeded,
      status: "fail",
      exitCode: 65,
      signature: "error: cannot find X in scope",
      diagnostic: "/src/PlayedMedia.swift:42:9: error: cannot find X in scope"
    });
    const prepare = journal.steps.find((entry) => entry.id === "prepare");
    expect(prepare?.status).toBe("fail");
    expect(prepare?.diagnostic).toContain("cannot find X in scope");
  });

  it("keeps the journal valid after a failure, because the repair loop resumes from exactly this file", () => {
    const journal = applyPrepare(startRunJournal(facts), {
      ...succeeded,
      status: "fail",
      exitCode: 65,
      signature: "error: cannot find X in scope",
      diagnostic: "boom"
    });
    expect(pilotRunJournalSchema.safeParse(journal).success).toBe(true);
  });

  it("counts the attempt, so the budget is visible in the file rather than only in memory", () => {
    const once = applyPrepare(startRunJournal(facts), succeeded);
    const twice = applyPrepare(once, succeeded);
    expect(twice.steps.find((entry) => entry.id === "prepare")?.attempts).toBe(2);
  });

  it("replaces the previous prepare result rather than appending a second one, because the journal allows a step once", () => {
    const once = applyPrepare(startRunJournal(facts), succeeded);
    const twice = applyPrepare(once, { ...succeeded, status: "fail", exitCode: 65, diagnostic: "boom" });
    expect(twice.steps.filter((entry) => entry.id === "prepare")).toHaveLength(1);
    expect(pilotRunJournalSchema.safeParse(twice).success).toBe(true);
  });

  it("leaves the later steps pending, because a passing build proves nothing about them", () => {
    const journal = applyPrepare(startRunJournal(facts), succeeded);
    expect(journal.steps.filter((entry) => entry.status === "pending")).toHaveLength(6);
  });
});

describe("recording the analysis", () => {
  const backed = {
    repository: "/tmp/iina",
    objects: [
      {
        name: "HistoryWindowController",
        proof: { path: "iina/HistoryWindowController.swift", line: 29, excerpt: "final class HistoryWindowController" },
        recordTypes: ["PlaybackHistory"],
        identifiers: [
          { property: "mpvMd5", proof: { path: "iina/PlaybackHistory.swift", line: 35, excerpt: "var mpvMd5: String" } }
        ],
        openers: [
          { symbol: "doubleAction", proof: { path: "iina/HistoryWindowController.swift", line: 277, excerpt: "func doubleAction()" } }
        ]
      }
    ],
    access: []
  };

  it("passes when an object was found, because that is the thing the run is for", () => {
    expect(analyseDiscovery(backed).status).toBe("pass");
  });

  it("is a refusal rather than a pass when nothing was found, because no candidate is not a result", () => {
    expect(analyseDiscovery({ ...backed, objects: [] }).status).toBe("refused");
  });

  it("names the reason it refused, so the reader is not left guessing", () => {
    expect(analyseDiscovery({ ...backed, objects: [] }).reason).toMatch(/no object/i);
  });

  it("fails when a finding carries no line, because the exit criterion of this step is a file and a line", () => {
    const unbacked = {
      ...backed,
      objects: [{ ...backed.objects[0]!, proof: { path: "iina/HistoryWindowController.swift", line: 0, excerpt: "x" } }]
    };
    expect(analyseDiscovery(unbacked).status).toBe("fail");
  });

  it("fails when an identifier is offered with no proof, rather than reporting it as found", () => {
    const unbacked = {
      ...backed,
      objects: [
        {
          ...backed.objects[0]!,
          identifiers: [{ property: "mpvMd5", proof: { path: "", line: 0, excerpt: "" } }]
        }
      ]
    };
    expect(analyseDiscovery(unbacked).status).toBe("fail");
  });

  it("counts only the objects that have an identifier and an opening path, because a candidate missing one is not actionable", () => {
    const partial = {
      ...backed,
      objects: [
        backed.objects[0]!,
        {
          name: "InspectorWindowController",
          proof: { path: "iina/InspectorWindowController.swift", line: 14, excerpt: "final class InspectorWindowController" },
          recordTypes: [],
          identifiers: [],
          openers: []
        }
      ]
    };
    expect(analyseDiscovery(partial).actionable).toBe(1);
  });

  it("marks analyse passed with the actionable count as its evidence", () => {
    const journal = applyAnalyse(startRunJournal(facts), analyseDiscovery(backed));
    const analyse = journal.steps.find((entry) => entry.id === "analyse");
    expect(analyse?.status).toBe("pass");
    expect(analyse?.evidence[0]?.note).toMatch(/1 of 1 object classes/);
  });

  it("keeps the journal valid after a pass, because the next step resumes from this file", () => {
    expect(pilotRunJournalSchema.safeParse(applyAnalyse(startRunJournal(facts), analyseDiscovery(backed))).success).toBe(true);
  });

  it("marks analyse refused with a diagnostic, because a refusal is a state the run can carry", () => {
    const journal = applyAnalyse(startRunJournal(facts), analyseDiscovery({ ...backed, objects: [] }));
    const analyse = journal.steps.find((entry) => entry.id === "analyse");
    expect(analyse?.status).toBe("blocked");
    expect(analyse?.diagnostic).toBeTruthy();
  });

  it("leaves prepare as it was, because analysing does not rebuild the application", () => {
    const journal = applyAnalyse(applyPrepare(startRunJournal(facts), succeeded), analyseDiscovery(backed));
    expect(journal.steps.find((entry) => entry.id === "prepare")?.status).toBe("pass");
  });
});

const readableDiscovery = {
  repository: "/tmp/iina",
  objects: [
    {
      name: "HistoryWindowController",
      proof: { path: "iina/HistoryWindowController.swift", line: 29, excerpt: "final class HistoryWindowController" },
      recordTypes: ["PlaybackHistory"],
      identifiers: [
        { property: "mpvMd5", proof: { path: "iina/PlaybackHistory.swift", line: 35, excerpt: "var mpvMd5: String" } }
      ],
      openers: [
        { symbol: "doubleAction", proof: { path: "iina/HistoryWindowController.swift", line: 277, excerpt: "func doubleAction()" } }
      ]
    }
  ],
  access: []
};

describe("recording the test step", () => {
  const suitesPass = { suitesPassed: true, checks: 91, commands: 3, unobserved: [] as readonly string[] };
  const appUnobserved = {
    suitesPassed: true,
    checks: 91,
    commands: 3,
    unobserved: ["a media item played in the built app reaches the index", "a system search result opens that exact item"]
  };

  it("passes when the suites pass and nothing is left unobserved", () => {
    expect(evaluateTest(suitesPass).status).toBe("pass");
  });

  it("is blocked when the suites pass but the app itself was not observed", () => {
    expect(evaluateTest(appUnobserved).status).toBe("blocked");
  });

  it("names what was not observed, because a blocked step has to say what is missing", () => {
    expect(evaluateTest(appUnobserved).reason).toContain("media item");
  });

  it("fails when a suite fails, and says so without pretending an observation is the problem", () => {
    const result = evaluateTest({ ...appUnobserved, suitesPassed: false });
    expect(result.status).toBe("fail");
    expect(result.reason).toContain("suite");
  });

  it("counts the checks it ran, because a number is the evidence a reader wants", () => {
    expect(evaluateTest(suitesPass).checks).toBe(91);
  });

  it("marks test blocked with a diagnostic when the app was not observed", () => {
    const journal = applyTest(startRunJournal(facts), evaluateTest(appUnobserved));
    const step = journal.steps.find((entry) => entry.id === "test");
    expect(step?.status).toBe("blocked");
    expect(step?.diagnostic).toBeTruthy();
  });

  it("carries the check count as evidence on a pass, so the journal is not just a status", () => {
    const journal = applyTest(startRunJournal(facts), evaluateTest(suitesPass));
    const step = journal.steps.find((entry) => entry.id === "test");
    expect(step?.status).toBe("pass");
    expect(step?.evidence[0]?.note).toContain("91");
  });

  it("keeps the journal valid either way, because a blocked step is a state the run carries", () => {
    expect(pilotRunJournalSchema.safeParse(applyTest(startRunJournal(facts), evaluateTest(appUnobserved))).success).toBe(true);
    expect(pilotRunJournalSchema.safeParse(applyTest(startRunJournal(facts), evaluateTest(suitesPass))).success).toBe(true);
  });

  it("leaves analyse as it was, because running the suites does not re-analyse", () => {
    const analysed = applyAnalyse(startRunJournal(facts), analyseDiscovery(readableDiscovery));
    const journal = applyTest(analysed, evaluateTest(appUnobserved));
    expect(journal.steps.find((entry) => entry.id === "analyse")?.status).toBe("pass");
  });
});

describe("a commit that moved under the run", () => {
  const done = () => {
    const base = startRunJournal(facts);
    const analysed = applyAnalyse(applyPrepare(base, succeeded), analyseDiscovery(readableDiscovery));
    return applyTest(analysed, evaluateTest({ suitesPassed: true, checks: 91, commands: 3, unobserved: [] }));
  };

  it("re-runs the first step when the code moved, because the earlier passes were about code that no longer exists", () => {
    expect(planRun(retargetJournal(done(), "9999999")).steps[0]).toBe("prepare");
  });

  it("re-runs everything when the code moved, not only the step that follows", () => {
    expect(planRun(retargetJournal(done(), "9999999")).steps).toHaveLength(7);
  });

  it("does not re-run a passed step when the commit did not move", () => {
    expect(planRun(retargetJournal(done(), facts.commit)).steps[0]).toBe("implement");
  });

  it("leaves the unpassed steps where they were, because a moved commit is not a reason to invent a pass", () => {
    expect(planRun(retargetJournal(done(), "9999999")).steps).toContain("implement");
  });

  it("keeps the recorded commit of each step, because that is what the pass was about", () => {
    const journal = retargetJournal(done(), "9999999");
    expect(journal.commit).toBe("9999999");
    expect(journal.steps.find((entry) => entry.id === "prepare")?.commit).toBe(facts.commit);
  });

  it("changes nothing else, so a retarget is not an excuse to rewrite history", () => {
    const before = done();
    const after = retargetJournal(before, "9999999");
    expect(after.steps).toEqual(before.steps);
  });
});

describe("recording the implement step", () => {
  const wired = { generatedPresent: true, adapterPresent: true, blockingTodos: 0, compiles: true };

  it("passes when the generated declarations and the adapter are both in the target and it compiles", () => {
    expect(evaluateImplement(wired).status).toBe("pass");
  });

  it("fails when the generated declarations are missing, because the contract produced nothing in the app", () => {
    expect(evaluateImplement({ ...wired, generatedPresent: false }).status).toBe("fail");
  });

  it("names what is missing when the generated declarations are absent", () => {
    expect(evaluateImplement({ ...wired, generatedPresent: false }).reason).toContain("generated");
  });

  it("fails when the adapter is missing, because the seams are what the integration is", () => {
    expect(evaluateImplement({ ...wired, adapterPresent: false }).status).toBe("fail");
  });

  it("fails on a blocking TODO, because a step that leaves the next one undone is not implemented", () => {
    expect(evaluateImplement({ ...wired, blockingTodos: 1 }).status).toBe("fail");
  });

  it("fails when the target does not compile", () => {
    expect(evaluateImplement({ ...wired, compiles: false }).status).toBe("fail");
  });

  it("says a target that does not compile is not implemented, because the words matter more than the state", () => {
    expect(evaluateImplement({ ...wired, compiles: false }).reason).toContain("compile");
  });

  it("marks implement passed with evidence, so the journal is not a row of statuses", () => {
    const journal = applyImplement(startRunJournal(facts), evaluateImplement(wired));
    const step = journal.steps.find((entry) => entry.id === "implement");
    expect(step?.status).toBe("pass");
    expect(step?.evidence.length).toBeGreaterThan(0);
  });

  it("keeps the journal valid on a pass and on a fail", () => {
    expect(pilotRunJournalSchema.safeParse(applyImplement(startRunJournal(facts), evaluateImplement(wired))).success).toBe(true);
    expect(
      pilotRunJournalSchema.safeParse(applyImplement(startRunJournal(facts), evaluateImplement({ ...wired, compiles: false }))).success
    ).toBe(true);
  });
});
