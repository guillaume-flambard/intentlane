export type ResolveModule = (request: string, roots: readonly string[]) => string;

export type ResolveExpoConfigPluginsOptions = Readonly<{
  projectRoot: string;
  resolveModule?: ResolveModule;
}>;

export type WriteNativeSourceOptions = Readonly<{
  platformProjectRoot: string;
  projectName: string;
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

export type EnsureNativeSourceOptions = Readonly<{
  project: unknown;
  projectName: string;
  xcodeUtils: XcodeUtils;
}>;

export type MergeContentsOptions = Readonly<{
  src: string;
  newSrc: string;
  tag: string;
  anchor: string | RegExp;
  offset: number;
  comment: string;
}>;

export type MergeContents = (options: MergeContentsOptions) => { contents: string };

export type RegisterResolverOptions = Readonly<{
  contents: string;
  language: string;
  mergeContents: MergeContents;
}>;

export type ExpoPluginApi = Readonly<{
  withDangerousMod: (config: unknown, entry: readonly [string, (modConfig: any) => Promise<unknown>]) => any;
  withXcodeProject: (config: unknown, action: (modConfig: any) => unknown) => any;
  withAppDelegate: (config: unknown, action: (modConfig: any) => unknown) => any;
  CodeGenerator: Readonly<{ mergeContents: MergeContents }>;
}>;

export type ApplyIdeaResolverDependencies = Readonly<{
  plugins: ExpoPluginApi;
  xcodeUtils: XcodeUtils;
  projectRoot: string;
}>;

export declare const NATIVE_GROUP: string;
export declare const NATIVE_SOURCE: string;
export declare const MERGE_TAG: string;
export declare const APP_DELEGATE_ANCHOR: RegExp;
export declare const REGISTRATION_CALL: string;
export declare const NATIVE_SOURCE_CONTENTS: string;

export declare function resolveExpoConfigPlugins(options: ResolveExpoConfigPluginsOptions): string;
export declare function writeNativeSource(options: WriteNativeSourceOptions): boolean;
export declare function ensureNativeSourceRegistered(options: EnsureNativeSourceOptions): boolean;
export declare function registerResolverInAppDelegate(options: RegisterResolverOptions): string;
export declare function applyIdeaResolver(
  config: unknown,
  options: unknown,
  dependencies: ApplyIdeaResolverDependencies
): unknown;
