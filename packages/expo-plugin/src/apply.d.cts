export type ResolveModule = (request: string) => string;

export type GeneratorInvocation = Readonly<{
  command: string;
  args: readonly string[];
  cwd: string;
}>;

export type GeneratorRequest = Readonly<{
  projectRoot: string;
  configFile: string;
  outputDirectory: string;
  resolveModule?: ResolveModule;
}>;

export type XcodeGroup = { children?: readonly { comment?: string }[] } | null | undefined;

export type XcodeUtils = Readonly<{
  ensureGroupRecursively: (project: unknown, groupName: string) => XcodeGroup;
  addBuildSourceFileToGroup: (options: {
    filepath: string;
    groupName: string;
    project: unknown;
    targetUuid: string;
  }) => unknown;
  getApplicationNativeTarget: (options: { project: unknown; projectName: string }) => { uuid: string };
}>;

export type EnsureSourceOptions = Readonly<{
  project: unknown;
  projectName: string;
  xcodeUtils: XcodeUtils;
}>;

export type ExpoPluginApi = Readonly<{
  withDangerousMod: (config: unknown, entry: readonly [string, (modConfig: any) => Promise<unknown>]) => any;
  withXcodeProject: (config: unknown, action: (modConfig: any) => unknown) => any;
}>;

export type ApplyOptions = Readonly<{ configFile?: string }>;

export type ApplyDependencies = Readonly<{
  plugins: ExpoPluginApi;
  xcodeUtils: XcodeUtils;
  projectRoot: string;
  runGenerator: (request: { projectRoot: string; configFile: string; outputDirectory: string }) => Promise<void> | void;
}>;

export declare const CLI_PACKAGE: string;
export declare const GENERATED_SOURCE: string;

export declare function resolveGeneratorInvocation(request: GeneratorRequest): GeneratorInvocation;
export declare function ensureGeneratedSourceRegistered(options: EnsureSourceOptions): boolean;
export declare function runGenerator(request: GeneratorRequest): void;
export declare function applyIntentLane(config: unknown, options: ApplyOptions, dependencies: ApplyDependencies): unknown;
