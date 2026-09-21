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

export type XcodeGroupUtils = Readonly<{
  ensureGroupRecursively: (project: unknown, groupName: string) => XcodeGroup;
  getApplicationNativeTarget: (options: { project: unknown; projectName: string }) => { uuid: string };
}>;

export type XcodeSourceUtils = XcodeGroupUtils &
  Readonly<{
    addBuildSourceFileToGroup: (options: {
      filepath: string;
      groupName: string;
      project: unknown;
      targetUuid: string;
    }) => unknown;
  }>;

export type XcodeResourceUtils = XcodeGroupUtils &
  Readonly<{
    addResourceFileToGroup: (options: {
      filepath: string;
      groupName: string;
      project: unknown;
      isBuildFile: boolean;
      verbose: boolean;
      targetUuid: string;
    }) => unknown;
  }>;

export type XcodeUtils = XcodeSourceUtils & XcodeResourceUtils;

export type EnsureSourceOptions = Readonly<{
  project: unknown;
  projectName: string;
  xcodeUtils: XcodeSourceUtils;
}>;

export type LocaleResource = Readonly<{
  locale: string;
  file: string;
  path: string;
}>;

export type EnsureLocaleResourcesOptions = Readonly<{
  project: unknown;
  projectName: string;
  outputDirectory: string;
  xcodeUtils: XcodeResourceUtils;
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
export declare const MANIFEST_FILE: string;

export declare function resolveGeneratorInvocation(request: GeneratorRequest): GeneratorInvocation;
export declare function ensureGeneratedSourceRegistered(options: EnsureSourceOptions): boolean;
export declare function localeResources(manifestFile: string): readonly LocaleResource[];
export declare function ensureLocaleResourcesRegistered(options: EnsureLocaleResourcesOptions): number;
export declare function runGenerator(request: GeneratorRequest): void;
export declare function applyIntentLane(config: unknown, options: ApplyOptions, dependencies: ApplyDependencies): unknown;
