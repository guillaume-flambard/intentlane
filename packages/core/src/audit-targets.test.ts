import { describe, expect, it } from "vitest";
import { describeTargets, filesForPlatform, readTargetMembership } from "./audit-targets.js";

const entry = (id: string, comment: string, lines: readonly string[]): readonly string[] => [
  `\t\t${id}${comment ? ` /* ${comment} */` : ""} = {`,
  ...lines.map((line) => `\t\t\t${line}`),
  "\t\t};"
];

const section = (name: string, entries: readonly (readonly string[])[]): readonly string[] => [
  `/* Begin ${name} section */`,
  ...entries.flat(),
  `/* End ${name} section */`
];

const line = (id: string, comment: string, fields: readonly string[]): readonly string[] => [
  `\t\t${id}${comment ? ` /* ${comment} */` : ""} = {${fields.join(" ")} };`
];

const PROJECT = [
  "// !$*UTF8*$!",
  "{",
  "\tobjects = {",
  "",
  ...section("PBXBuildFile", [
    line("AA0000000000000000000001", "App.swift in Sources", [
      "isa = PBXBuildFile;",
      "fileRef = BB0000000000000000000001 /* App.swift */;"
    ]),
    line("AA0000000000000000000002", "Shared.swift in Sources", [
      "isa = PBXBuildFile;",
      "fileRef = BB0000000000000000000003 /* Shared.swift */;"
    ]),
    line("AA0000000000000000000003", "Shared.swift in Sources", [
      "isa = PBXBuildFile;",
      "fileRef = BB0000000000000000000003 /* Shared.swift */;"
    ]),
    line("AA0000000000000000000004", "AddFeedAppIntent.swift in Sources", [
      "isa = PBXBuildFile;",
      "fileRef = BB0000000000000000000002 /* AddFeedAppIntent.swift */;"
    ])
  ]),
  "",
  ...section("PBXFileReference", [
    line("BB0000000000000000000001", "App.swift", ['isa = PBXFileReference; path = App.swift; sourceTree = "<group>";']),
    line("BB0000000000000000000002", "AddFeedAppIntent.swift", [
      'isa = PBXFileReference; path = AddFeedAppIntent.swift; sourceTree = "<group>";'
    ]),
    line("BB0000000000000000000003", "Shared.swift", [
      'isa = PBXFileReference; path = Shared.swift; sourceTree = "<group>";'
    ]),
    line("BB0000000000000000000004", "Orphan.swift", [
      'isa = PBXFileReference; path = Orphan.swift; sourceTree = "<group>";'
    ])
  ]),
  "",
  ...section("PBXGroup", [
    entry("CC0000000000000000000001", "", [
      "isa = PBXGroup;",
      "children = (",
      "\tCC0000000000000000000002 /* App */,",
      "\tCC0000000000000000000003 /* iOS */,",
      ");",
      'sourceTree = "<group>";'
    ]),
    entry("CC0000000000000000000002", "App", [
      "isa = PBXGroup;",
      "children = (",
      "\tBB0000000000000000000001 /* App.swift */,",
      "\tBB0000000000000000000003 /* Shared.swift */,",
      "\tBB0000000000000000000004 /* Orphan.swift */,",
      ");",
      "path = App;",
      'sourceTree = "<group>";'
    ]),
    entry("CC0000000000000000000003", "iOS", [
      "isa = PBXGroup;",
      "children = (",
      "\tCC0000000000000000000004 /* AppIntents */,",
      ");",
      "path = iOS;",
      'sourceTree = "<group>";'
    ]),
    entry("CC0000000000000000000004", "AppIntents", [
      "isa = PBXGroup;",
      "children = (",
      "\tBB0000000000000000000002 /* AddFeedAppIntent.swift */,",
      ");",
      "path = AppIntents;",
      'sourceTree = "<group>";'
    ])
  ]),
  "",
  ...section("PBXNativeTarget", [
    entry("EE0000000000000000000001", "App", [
      "isa = PBXNativeTarget;",
      "buildConfigurationList = FF0000000000000000000001 /* Build configuration list for PBXNativeTarget \"App\" */;",
      "buildPhases = (",
      "\tDD0000000000000000000001 /* Sources */,",
      ");",
      "name = App;",
      'productType = "com.apple.product-type.application";'
    ]),
    entry("EE0000000000000000000002", "App-iOS", [
      "isa = PBXNativeTarget;",
      "buildConfigurationList = FF0000000000000000000002 /* Build configuration list for PBXNativeTarget \"App-iOS\" */;",
      "buildPhases = (",
      "\tDD0000000000000000000002 /* Sources */,",
      ");",
      "name = App-iOS;",
      'productType = "com.apple.product-type.application";'
    ])
  ]),
  "",
  ...section("PBXProject", [
    line("AD0000000000000000000001", "Project object", [
      "isa = PBXProject;",
      "mainGroup = CC0000000000000000000001;"
    ])
  ]),
  "",
  ...section("PBXSourcesBuildPhase", [
    line("DD0000000000000000000001", "Sources", [
      "isa = PBXSourcesBuildPhase;",
      "files = (AA0000000000000000000001, AA0000000000000000000002,);"
    ]),
    line("DD0000000000000000000002", "Sources", [
      "isa = PBXSourcesBuildPhase;",
      "files = (AA0000000000000000000003, AA0000000000000000000004,);"
    ])
  ]),
  "",
  ...section("XCBuildConfiguration", [
    line("BE0000000000000000000001", "Debug", ["isa = XCBuildConfiguration;", "SDKROOT = macosx;"]),
    line("BE0000000000000000000002", "Debug", ["isa = XCBuildConfiguration;", "SDKROOT = iphoneos;"])
  ]),
  "",
  ...section("XCConfigurationList", [
    line("FF0000000000000000000001", "Build configuration list", [
      "isa = XCConfigurationList;",
      "buildConfigurations = (BE0000000000000000000001,);"
    ]),
    line("FF0000000000000000000002", "Build configuration list", [
      "isa = XCConfigurationList;",
      "buildConfigurations = (BE0000000000000000000002,);"
    ])
  ]),
  "",
  "\t};",
  "\trootObject = AD0000000000000000000001;",
  "}"
].join("\n");

const FILES = [
  "App/App.swift",
  "App/Orphan.swift",
  "App/Shared.swift",
  "iOS/AppIntents/AddFeedAppIntent.swift"
];

describe("readTargetMembership", () => {
  it("reads every target with its platform and its compiled files", () => {
    expect(readTargetMembership(PROJECT)).toEqual([
      { name: "App", platform: "macos", files: ["App/App.swift", "App/Shared.swift"], folders: [] },
      {
        name: "App-iOS",
        platform: "ios",
        files: ["App/Shared.swift", "iOS/AppIntents/AddFeedAppIntent.swift"],
        folders: []
      }
    ]);
  });

  it("returns nothing when the project carries no section", () => {
    expect(readTargetMembership("{}")).toEqual([]);
  });
});

describe("filesForPlatform", () => {
  it("drops a file that only another platform compiles", () => {
    const memberships = readTargetMembership(PROJECT);
    expect([...filesForPlatform(memberships, "macos", FILES)].sort()).toEqual([
      "App/App.swift",
      "App/Orphan.swift",
      "App/Shared.swift"
    ]);
  });

  it("keeps the file the requested platform compiles", () => {
    const memberships = readTargetMembership(PROJECT);
    expect([...filesForPlatform(memberships, "ios", FILES)].sort()).toEqual([
      "App/Orphan.swift",
      "App/Shared.swift",
      "iOS/AppIntents/AddFeedAppIntent.swift"
    ]);
  });

  it("keeps a file that no target owns, because it is ambiguous", () => {
    const memberships = readTargetMembership(PROJECT);
    const scoped = filesForPlatform(memberships, "ios", FILES);
    expect(scoped).toContain("App/Orphan.swift");
    expect(scoped).not.toContain("App/App.swift");
  });

  it("applies the prefix of a nested project", () => {
    const memberships = readTargetMembership(PROJECT);
    const scoped = filesForPlatform(
      memberships,
      "macos",
      ["Demo/App/App.swift", "Demo/iOS/AppIntents/AddFeedAppIntent.swift"],
      "Demo"
    );
    expect([...scoped]).toEqual(["Demo/App/App.swift"]);
  });
});

describe("describeTargets", () => {
  it("names the targets that scope the report", () => {
    const report = describeTargets(readTargetMembership(PROJECT), "macos");
    expect(report.scoped).toBe(true);
    expect(report.nextAction).toBe("Only the Swift files that App compile were inspected for macos.");
  });

  it("explains that no target was found", () => {
    const report = describeTargets([], "macos");
    expect(report.scoped).toBe(false);
    expect(report.nextAction).toBe("No Xcode target was found, so every Swift file in the tree was inspected.");
  });

  it("explains that no target declares the platform", () => {
    const report = describeTargets([{ name: "App-iOS", platform: "ios", files: [], folders: [] }], "macos");
    expect(report.scoped).toBe(false);
    expect(report.nextAction).toBe("No target declares macos, so the report describes the whole tree.");
  });
});

const SYNCHRONIZED = [
  "// !$*UTF8*$!",
  "{",
  "\tobjects = {",
  "",
  ...section("PBXNativeTarget", [
    entry("90000000000000000000B001", "App", [
      "isa = PBXNativeTarget;",
      "buildConfigurationList = 90000000000000000000C001 /* Build configuration list */;",
      "fileSystemSynchronizedGroups = (",
      "\t90000000000000000000A001 /* Mac */,",
      ");",
      "name = App;"
    ]),
    entry("90000000000000000000B002", "App-iOS", [
      "isa = PBXNativeTarget;",
      "buildConfigurationList = 90000000000000000000C002 /* Build configuration list */;",
      "fileSystemSynchronizedGroups = (",
      "\t90000000000000000000A002 /* iOS */,",
      ");",
      "name = App-iOS;"
    ])
  ]),
  "",
  ...section("PBXFileSystemSynchronizedRootGroup", [
    line("90000000000000000000A001", "Mac", [
      "isa = PBXFileSystemSynchronizedRootGroup;",
      "path = Mac;",
      'sourceTree = "<group>";'
    ]),
    line("90000000000000000000A002", "iOS", [
      "isa = PBXFileSystemSynchronizedRootGroup;",
      "path = iOS;",
      'sourceTree = "<group>";'
    ]),
    line("90000000000000000000A003", "xcconfig", [
      "isa = PBXFileSystemSynchronizedRootGroup;",
      "path = xcconfig;",
      'sourceTree = "<group>";'
    ])
  ]),
  "",
  ...section("XCBuildConfiguration", [
    entry("90000000000000000000D001", "Debug", [
      "isa = XCBuildConfiguration;",
      "baseConfigurationReferenceAnchor = 90000000000000000000A003 /* xcconfig */;",
      "baseConfigurationReferenceRelativePath = App_mac.xcconfig;"
    ]),
    entry("90000000000000000000D002", "Debug", [
      "isa = XCBuildConfiguration;",
      "baseConfigurationReferenceAnchor = 90000000000000000000A003 /* xcconfig */;",
      "baseConfigurationReferenceRelativePath = App_ios.xcconfig;"
    ])
  ]),
  "",
  ...section("XCConfigurationList", [
    line("90000000000000000000C001", "Build configuration list", [
      "isa = XCConfigurationList;",
      "buildConfigurations = (90000000000000000000D001,);"
    ]),
    line("90000000000000000000C002", "Build configuration list", [
      "isa = XCConfigurationList;",
      "buildConfigurations = (90000000000000000000D002,);"
    ])
  ]),
  "",
  "\t};",
  "}"
].join("\n");

const XCCONFIGS: Readonly<Record<string, string>> = {
  "xcconfig/App_mac.xcconfig": '#include "./common/mac.xcconfig"\n',
  "xcconfig/App_ios.xcconfig": '#include "./common/ios.xcconfig"\n',
  "xcconfig/common/mac.xcconfig": '#include? "../../Shared/Project.xcconfig"\nSDKROOT = macosx;\n',
  "xcconfig/common/ios.xcconfig": "SDKROOT = iphoneos;\n"
};

const readXcconfig = (path: string): string | undefined => XCCONFIGS[path];

describe("readTargetMembership with synchronized folders", () => {
  it("reads the folders a target compiles and the platform from its xcconfig", () => {
    expect(readTargetMembership(SYNCHRONIZED, readXcconfig)).toEqual([
      { name: "App", platform: "macos", files: [], folders: ["Mac"] },
      { name: "App-iOS", platform: "ios", files: [], folders: ["iOS"] }
    ]);
  });

  it("scopes a synchronized folder to the platform that compiles it", () => {
    const memberships = readTargetMembership(SYNCHRONIZED, readXcconfig);
    const files = ["Mac/App.swift", "iOS/AppIntents/AddFeedAppIntent.swift", "README.md"];
    expect([...filesForPlatform(memberships, "macos", files)].sort()).toEqual(["Mac/App.swift", "README.md"]);
    expect([...filesForPlatform(memberships, "ios", files)].sort()).toEqual([
      "README.md",
      "iOS/AppIntents/AddFeedAppIntent.swift"
    ]);
  });

  it("treats a project at the audited root as no prefix", () => {
    const memberships = readTargetMembership(SYNCHRONIZED, readXcconfig);
    const files = ["Mac/App.swift", "iOS/AppIntents/AddFeedAppIntent.swift", "README.md"];
    expect(filesForPlatform(memberships, "macos", files, ".")).toEqual(
      filesForPlatform(memberships, "macos", files, "")
    );
    expect(filesForPlatform(memberships, "macos", files, ".")).not.toContain("iOS/AppIntents/AddFeedAppIntent.swift");
  });

  it("leaves the platform unknown when no xcconfig can be read", () => {
    const targets = readTargetMembership(SYNCHRONIZED);
    expect(targets.map((target) => target.platform)).toEqual([undefined, undefined]);
  });
});
