import { Settings } from "react-native";
import { ideaEntityPayloads, type Idea } from "./ideas";

export const IDEAS_SETTINGS_KEY = "intentlane.ideas";

export function publishIdeas(ideas: readonly Idea[]): void {
  Settings.set({ [IDEAS_SETTINGS_KEY]: JSON.stringify(ideaEntityPayloads(ideas)) });
}
