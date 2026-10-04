import * as brands from "./brands.tsx";
import * as semantic from "./semantic.tsx";

export type { IconProps, IconComponent } from "./types.ts";
export * from "./brands.tsx";
export * from "./semantic.tsx";

/**
 * Unified Icons namespace exposing semantic and brand icons for the application.
 */
export const Icons = {
  ...brands,
  ...semantic,
};

export type IconName = keyof typeof Icons;
